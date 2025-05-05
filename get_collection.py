import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import json
import os
import argparse
import datetime

# Custom JSON encoder to handle Firestore special types
class FirestoreEncoder(json.JSONEncoder):
    def default(self, obj):
        # Handle Firestore timestamps (both server and client timestamps)
        if hasattr(obj, 'timestamp'):
            return obj.isoformat()
        # Handle regular datetime objects
        elif isinstance(obj, datetime.datetime):
            return obj.isoformat()
        # Handle Firestore DocumentReference objects
        elif hasattr(obj, 'path'):
            # For document references, store the path
            return {
                "__firestore_reference__": True,
                "path": obj.path
            }
        # Handle any other firestore types by converting to string
        elif hasattr(obj, '_document_path') or str(type(obj)).startswith("<class 'google.cloud.firestore"):
            return str(obj)
        # Let the base class handle everything else
        return super().default(obj)

def initialize_firebase(credentials_path):
    """Initialize Firebase with the given credentials."""
    cred = credentials.Certificate(credentials_path)
    firebase_admin.initialize_app(cred)
    return firestore.client()

def get_all_subcollections(doc_ref):
    """Get all subcollections for a document."""
    return [col.id for col in doc_ref.collections()]

def process_document(doc_ref, base_path):
    """Process a document and all its subcollections recursively."""
    try:
        # Get document data
        doc = doc_ref.get()
        if not doc.exists:
            print(f"Document {doc_ref.path} does not exist")
            return
        
        doc_data = doc.to_dict()
        doc_id = doc_ref.id
        
        # Create directory structure matching the document path
        dir_path = os.path.join(base_path, *doc_ref.path.split('/'))
        os.makedirs(os.path.dirname(dir_path), exist_ok=True)
        
        # Save document data
        file_path = f"{dir_path}.json"
        with open(file_path, 'w') as f:
            json.dump(doc_data, f, indent=2, cls=FirestoreEncoder)
        
        print(f"Saved document {doc_ref.path} to {file_path}")
        
        # Get all subcollections
        subcollections = get_all_subcollections(doc_ref)
        
        # Save subcollection info
        if subcollections:
            subcollections_path = f"{dir_path}_subcollections.json"
            with open(subcollections_path, 'w') as f:
                json.dump(subcollections, f, indent=2)
            
            # Process each subcollection
            for subcol_id in subcollections:
                subcol_ref = doc_ref.collection(subcol_id)
                process_collection(subcol_ref, base_path)
    
    except Exception as e:
        print(f"Error processing document {doc_ref.path}: {str(e)}")

def process_collection(collection_ref, base_path):
    """Process a collection and all its documents recursively."""
    try:
        docs = collection_ref.stream()
        
        # Process each document in the collection
        for doc in docs:
            doc_ref = collection_ref.document(doc.id)
            process_document(doc_ref, base_path)
    
    except Exception as e:
        print(f"Error processing collection {collection_ref.path}: {str(e)}")

def retrieve_collection_with_subcollections(db, collection_name, output_dir):
    """Retrieve all documents and subcollections recursively."""
    # Create output directory if it doesn't exist
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Created directory: {output_dir}")
    
    # Get collection reference
    collection_ref = db.collection(collection_name)
    
    # Process the collection recursively
    process_collection(collection_ref, output_dir)
    
    print(f"Retrieved collection '{collection_name}' with all subcollections")

def main():
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Retrieve Firestore collection and subcollections as JSON files.')
    parser.add_argument('--credentials', required=True, help='Path to Firebase credentials JSON file')
    parser.add_argument('--collection', required=True, help='Name of the Firestore collection to retrieve')
    parser.add_argument('--output', default='firestore_data', help='Output directory for JSON files')
    
    # Parse arguments
    args = parser.parse_args()
    
    # Initialize Firebase
    db = initialize_firebase(args.credentials)
    
    # Retrieve collection with subcollections
    retrieve_collection_with_subcollections(db, args.collection, args.output)

if __name__ == '__main__':
    main()
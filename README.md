# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

# School Transportation Management App

A management system for organizing school bus routes, drivers, and user access.

## Features

### Driver Management
- View and manage drivers in your school transportation system
- Add new drivers with their contact details
- Edit existing driver information
- Delete drivers from the system
- Send password reset emails to drivers

### Students/Parents Management
- Manage students and parents who need access to bus route information
- Add new users (students or parents)
- Edit user details including their user type
- Assign viewable routes to users
- Send password reset emails to users

## Modal Components

The application includes two main modal components for managing users:

### DriverModal

Used for creating and editing driver accounts. Features include:
- Name, email, and phone fields
- Vehicle assignment
- Password reset functionality

### UserModal

Used for creating and editing student/parent accounts. Features include:
- Name, email, and phone fields
- User type selection (student or parent)
- Route assignment
- Password reset functionality

## Password Reset Functionality

Password management is handled through a "Send Password Reset Email" button on user edit forms. This feature:
- Sends a password reset link to the user's email
- Allows users to securely update their passwords
- Maintains user account security without admin password access

## Development Notes

- Firebase Authentication will be integrated for actual password reset functionality
- Current implementation uses placeholder functions that simulate the behavior

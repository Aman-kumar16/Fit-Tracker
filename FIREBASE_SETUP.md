# Firebase Setup Instructions

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Give your project a name (e.g., "FitTrack")

## 2. Create a Web App

1. In your Firebase project, click on the Web icon (`</>`) to add a web app
2. Register your app with a nickname (e.g., "FitTrack Web")
3. Copy the Firebase configuration object

## 3. Enable Firestore Database

1. In the Firebase Console, go to "Build" > "Firestore Database"
2. Click "Create database"
3. Start in **production mode** (you can adjust rules later)
4. Choose a Firestore location closest to your users

## 4. Update Firebase Config

Open `src/lib/firebase.ts` and replace the placeholder config with your actual Firebase configuration:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

## 5. Configure Firestore Security Rules (Optional)

For development, you can use these permissive rules. **Update them for production!**

Go to Firestore Database > Rules and paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all documents (DEVELOPMENT ONLY)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**For production**, implement proper security rules based on user authentication.

## 6. Test Your Connection

Once you've updated the config:
1. Add an exercise in the "Exercises" tab
2. Check your Firestore Database console to see the data appear
3. Log a workout in the "Workouts" tab

## Data Structure

The app uses the following Firestore structure:

```
exercises/
  {exerciseId}/
    - name: string
    - createdAt: timestamp

workouts/
  {YYYY-MM-DD}/
    - date: string
    - updatedAt: timestamp
    
    exercises/
      {exerciseId}/
        - exerciseName: string
        - updatedAt: timestamp
        
        sets/
          {setId}/
            - weight: number
            - reps: number
            - timestamp: timestamp
```

## Need Help?

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Getting Started](https://firebase.google.com/docs/firestore/quickstart)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

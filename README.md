# Monitoring-app

# Employee Activity Monitoring & Attendance Tracking

A full-featured desktop application for monitoring employee activity, attendance, and productivity, built with Electron, React, TypeScript, and Node.js.

## Features

- **Manager Dashboard**: View real-time employee status, generate reports, and manage employee data.
- **Employee Portal**: Clock in/out, view personal activity summaries.
- **Real-time Monitoring**: Track active applications, window titles, and idle time.
- **Comprehensive Reporting**: Generate daily, weekly, and monthly reports with productivity metrics.
- **Secure Authentication**: Manager login with encrypted credentials and session management.
- **Local Database**: Uses SQLite for reliable, local data storage.

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/employee-monitoring-app.git
    cd employee-monitoring-app
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## Development

To run the application in development mode with hot-reloading:

```bash
npm run electron-dev


HOW TO RUN :-

This will start the React development server and launch the Electron application. 
Building for Production 

To create a distributable .exe installer for Windows: 

    Build the React app: 
    bash
     
     

 
1
npm run build {COPY PASTE}
 
 
  

Package the application with Electron Builder: 
bash
 
 

     
    1
    npm run electron-pack {COPY PASTE}
     
     
      

The final installer will be located in the dist/ directory. 
Default Credentials 

     Username: admin  $$ IMP 
     Password: admin123  $$ IMP 
     

Project Structure {READ FIRST}

     public/: Contains the main Electron process file (electron.js).
     src/: Contains all the React, TypeScript, and Node.js backend code.
         components/: React UI components for manager and employee views.
         database/: SQLite database connection, schema, and model files.
         ipc/: IPC (Inter-Process Communication) handlers for the Electron main process.
         services/: Backend services for monitoring, authentication, and reporting.
         types/: TypeScript type definitions.
         utils/: Utility functions for encryption, validation, and helpers.
         
     build/: Assets used for the application build (e.g., icon).
     

     FOR GIT CONTRIBUTION 
     Contributing 

    Fork the repository. 
    Create a feature branch (git checkout -b feature/AmazingFeature). 
    Commit your changes (git commit -m 'Add some AmazingFeature'). 
    Push to the branch (git push origin feature/AmazingFeature). 
    Open a Pull Request. 

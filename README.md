# Dismissal App v.1 - admin, teacher, student page.

A comprehensive student dismissal management system with barcode scanning, real-time tracking, and role-based access control for efficient student pickup management.

## 🚀 Features

- **🔐 Role-based Authentication**: Admin, Teacher, and Student roles with different permissions
- **📊 Barcode Scanning**: Quick student check-in/check-out using barcode technology
- **🔄 Real-time Updates (Socket.IO)**: Live tracking of active students with instant updates
- **👥 Student Management**: Complete student database with class organization
- **📈 Activity Tracking**: Comprehensive logging of all check-ins and check-outs
- **📱 Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **🔊 Sound Notifications**: Audio alerts for student arrivals and departures
- **📸 Photo Display**: Student photo identification system
- **⚡ Performance Optimized**: Fast and efficient data handling

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js framework
- **Socket.IO** for real-time communication
- **SQLite** database for lightweight storage
- **JWT** authentication for secure access
- **CORS** enabled for cross-origin requests
- **Multer** for file uploads (student photos)

### Frontend
- **React.js** with React Router for navigation
- **Axios** for API communication
- **React Hot Toast** for user notifications
- **CSS3** with modern Flexbox/Grid layouts
- **Context API** for state management

## 📦 Installation & Setup

### Prerequisites
- Node.js (v16 or higher recommended)
- npm or yarn package manager

### Quick Start

1. **Clone and setup the project:**
```bash
# Install backend dependencies
cd server && npm install
# Install Socket.IO for real-time communication
npm install socket.io

# Install frontend dependencies  
cd ../client && npm install

# Return to root directory
cd ..
```

2. **Environment Configuration:**
Create a `.env` file in the server directory:
```env
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
```

Create a `.env` file in the client directory:
```env
REACT_APP_WEBSOCKET_URL=ws://localhost:5000
```


3. **Start the application:**
```bash
# Terminal 1 - Start backend server
cd server && npm start

# Terminal 2 - Start frontend development server
cd client && npm start
```

- Backend API: `http://localhost:5000`
- Frontend App: `http://localhost:3000`

## 🔐 Default Login Credentials

- **Administrator**: 
  - Username: `admin`
  - Password: `admin123`
  - Access: Full system control, student management, statistics

- **Teacher**: 
  - Username: `teacher` 
  - Password: `teacher123`
  - Access: Student check-in/out, view active students, barcode scanning

- **Student**:
  - Username: `student`
  - Password: `student123`
  - Access: View own status, check-in history

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User authentication and JWT token generation
- `POST /api/auth/init` - Database initialization (first-time setup)

### Student Management
- `GET /api/students` - Retrieve all students (admin only)
- `GET /api/students/barcode/:barcode` - Find student by barcode
- `POST /api/students` - Create new student record (admin only)
- `PUT /api/students/:id` - Update student information (admin only)
- `DELETE /api/students/:id` - Remove student from system (admin only)

### Dismissal Operations
- `POST /api/dismissal/check-in` - Check student into the system
- `POST /api/dismissal/check-out` - Check student out of the system
- `GET /api/dismissal/active` - Get currently active students
- `DELETE /api/dismissal/active/clear` - Clear all active students (teacher+)

### User Management
- `GET /api/users` - Get all users (admin only)
- `POST /api/users` - Create new user account (admin only)

## 🗃️ Database Schema

### Students Table
```sql
id INTEGER PRIMARY KEY
barcode TEXT UNIQUE
name TEXT NOT NULL
class TEXT
photo_path TEXT
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### Active Students Table  
```sql
id INTEGER PRIMARY KEY
student_id INTEGER
checked_in_at DATETIME DEFAULT CURRENT_TIMESTAMP
FOREIGN KEY (student_id) REFERENCES students(id)
```

### Dismissal Logs Table
```sql
id INTEGER PRIMARY KEY
student_id INTEGER
action TEXT CHECK(action IN ('check_in', 'check_out'))
timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
FOREIGN KEY (student_id) REFERENCES students(id)
```

### Users Table
```sql
id INTEGER PRIMARY KEY
username TEXT UNIQUE NOT NULL
password TEXT NOT NULL (bcrypt hashed)
role TEXT CHECK(role IN ('admin', 'teacher', 'student'))
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

## 📁 Project Structure

```
Web-App Penjemput V.04.2.beta/
├── server/                 # Backend Node.js application
│   ├── config/            # Configuration files
│   │   └── database.js    # Database connection and setup
│   ├── models/            # Data models and ORM
│   │   ├── User.js        # User model and methods
│   │   ├── Student.js     # Student model and methods  
│   │   └── Dismissal.js   # Dismissal tracking model
│   ├── middleware/        # Custom middleware
│   │   └── auth.js        # JWT authentication middleware
│   ├── routes/           # API route handlers
│   │   ├── auth.js       # Authentication routes
│   │   ├── students.js   # Student management routes
│   │   ├── dismissal.js  # Dismissal operations routes
│   │   └── users.js      # User management routes
│   ├── uploads/          # File upload directory (student photos)
│   ├── index.js          # Main server entry point
│   └── package.json      # Backend dependencies
├── client/               # Frontend React application
│   ├── public/           # Static assets
│   │   └── index.html    # Main HTML template
│   ├── src/             # React source code
│   │   ├── components/   # Reusable UI components
│   │   │   └── ProtectedRoute.js # Route protection
│   │   ├── pages/       # Application pages
│   │   │   ├── Login.js          # Login page
│   │   │   ├── Dashboard.js      # Main dashboard
│   │   │   ├── TeacherDashboard.js # Teacher interface
│   │   │   ├── AdminDashboard.js  # Admin management
│   │   │   └── StudentDashboard.js # Student view
│   │   ├── contexts/    # React Context providers
│   │   │   └── AuthContext.js    # Authentication state
│   │   │   └── SocketContext.js  # WebSocket state
│   │   ├── services/    # API service layer
│   │   │   └── api.js           # Axios API client
│   │   ├── App.js       # Main application component
│   │   ├── index.js     # React entry point
│   │   └── index.css    # Global styles
│   └── package.json     # Frontend dependencies
├── .gitignore          # Git ignore rules
├── README.md          # This documentation
└── TODO.md           # Development roadmap
```

## 🎯 Usage Guide

### For Teachers:
1. **Login** with teacher credentials
2. **Scan Barcodes** using the barcode scanner interface
3. **Monitor Active Students** in real-time dashboard
4. **Clear Session** when dismissal is complete

### For Administrators:
1. **Manage Students** - Add, edit, or remove student records
2. **User Management** - Create and manage user accounts
3. **System Monitoring** - View activity logs and statistics
4. **Database Maintenance** - Backup and restore operations

### For Students:
1. **Check Status** - View current dismissal status
2. **History** - Review past check-in/check-out times

## 🛡️ Security Features

- **JWT Authentication** with secure token storage
- **Password Hashing** using bcrypt algorithm
- **Role-based Access Control** (RBAC)
- **CORS Protection** for API security
- **Input Validation** on all endpoints
- **SQL Injection Prevention** through parameterized queries

## 🔧 Development

### Adding New Features

1. **Backend Development:**
   - Create model methods in appropriate model file
   - Add API routes with proper validation
   - Implement middleware for authentication/authorization
   - Update database schema if needed

2. **Frontend Development:**
   - Create React components in appropriate directories
   - Add API service methods for new endpoints
   - Implement UI state management
   - Add styling with CSS modules

### Environment Variables

- `PORT`: Server port number (default: 5000)
- `JWT_SECRET`: Secret key for JWT token signing
- `NODE_ENV`: Environment mode (development/production)
- `DB_PATH`: SQLite database file path

### Database Migrations

The system automatically initializes the database schema on first run. For production deployments, consider implementing proper migration scripts.

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📄 License

This project is proprietary software developed for educational institution use. All rights reserved.

## 🆘 Support

For technical support, bug reports, or feature requests:
- Check the existing issues in the repository
- Create a new issue with detailed description
- Contact the development team for urgent matters

## 📋 Version History

- **v0.4.2.beta** - Current version: Enhanced photo display, improved UI, performance optimizations
- **v0.4.1** - Added sound notifications and audio feedback
- **v0.4.0** - Initial web application release with core functionality
- **v0.3.0** - Flask backend version (deprecated)
- **v1.0.0** - Production-ready release (planned)

## 🚨 Important Notes

- Always change default passwords in production environments
- Regularly backup the database file
- Ensure proper file permissions for uploads directory
- Use HTTPS in production for secure communication
- Monitor server logs for unusual activity

---

*Built with ❤️ for efficient school dismissal management*

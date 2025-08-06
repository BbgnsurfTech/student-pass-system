# Student Pass System - Analytics Dashboard

## Overview

The Analytics Dashboard provides comprehensive insights into your student pass management system, enabling data-driven decisions through real-time monitoring, detailed reporting, and predictive analytics.

## Features

### 🎯 Key Metrics Dashboard
- **Total Applications**: Track application volumes with trend analysis
- **Active Students**: Monitor student enrollment and engagement
- **Pass Distribution**: Visualize active, expired, and revoked passes  
- **Access Events**: Real-time access attempt monitoring

### 📊 Visual Analytics
- **Line Charts**: Time-series data for trends and patterns
- **Bar Charts**: Comparative analysis across departments/schools
- **Pie Charts**: Distribution breakdowns with percentages
- **Heatmaps**: Access patterns by time and location
- **Funnel Charts**: Application approval process flow

### 🔄 Real-time Monitoring
- **Live User Activity**: Current active users and recent actions
- **System Health**: Database connectivity and performance metrics
- **Queue Status**: Pending applications and processing times
- **Alert System**: Automated notifications for anomalies

### 📈 Advanced Reporting
- **Custom Date Ranges**: Flexible time period selection
- **Export Options**: PDF and CSV report generation
- **Scheduled Reports**: Automated report delivery
- **Comparative Analysis**: Period-over-period comparisons
- **Predictive Analytics**: Trend forecasting and capacity planning

### 👥 Role-based Access
- **School Admin**: Institution-wide metrics and insights
- **Department Staff**: Department-specific analytics
- **Security Personnel**: Access control and incident reports
- **Super Admin**: System-wide performance and usage

## API Endpoints

### Core Analytics
- `GET /api/analytics/metrics` - Key dashboard metrics
- `GET /api/analytics/applications` - Application analytics
- `GET /api/analytics/access` - Access control analytics
- `GET /api/analytics/users` - User engagement metrics
- `GET /api/analytics/realtime` - Real-time system status

### Data Export
- `GET /api/analytics/export` - Export reports in various formats

### Real-time Features
- WebSocket connection for live updates
- Event-driven notifications
- Real-time dashboard refresh

## Usage

### 1. Access the Dashboard
Navigate to `/admin/analytics` in the admin panel.

### 2. Configure Filters
- Select date range (7d, 30d, 90d, 1y, week, month)
- Filter by school or department
- Apply custom date ranges

### 3. Customize View
- Toggle widgets on/off
- Adjust auto-refresh intervals
- Rearrange dashboard layout

### 4. Export Reports
- Choose report type (comprehensive, applications, access, users)
- Select format (JSON, CSV)
- Download or schedule delivery

## Technology Stack

### Frontend
- **React + TypeScript**: Component-based UI
- **Redux Toolkit**: State management
- **Chart.js**: Data visualization
- **Tailwind CSS**: Styling and responsive design
- **Framer Motion**: Animations and transitions
- **Socket.IO Client**: Real-time updates

### Backend
- **Node.js + Express**: RESTful API server
- **Prisma ORM**: Database operations
- **Socket.IO**: Real-time communication
- **NodeCache**: In-memory caching
- **PostgreSQL**: Primary database

## Performance Features

### Caching Strategy
- **5-minute cache** for key metrics
- **30-second cache** for real-time data
- **Client-side caching** for frequently accessed data
- **Intelligent cache invalidation** on data updates

### Optimization
- **Database query optimization** with proper indexing
- **Batch processing** for large datasets
- **Lazy loading** for dashboard widgets
- **Connection pooling** for database efficiency

### Scalability
- **Horizontal scaling** support
- **Load balancing** ready
- **Microservice architecture** compatible
- **CDN integration** for static assets

## Security & Compliance

### Authentication
- **JWT-based authentication**
- **Role-based access control (RBAC)**
- **Session management**
- **Token refresh mechanism**

### Data Protection
- **Data anonymization** for sensitive information
- **Audit logging** for all analytics access
- **Rate limiting** to prevent abuse
- **Input validation** and sanitization

## Monitoring & Alerts

### System Alerts
- **High failure rates** (>20% access denials)
- **Application backlogs** (>50 pending >24hrs)
- **Performance issues** (slow query detection)
- **System downtime** notifications

### Custom Alerts
- Configure thresholds for key metrics
- Email and real-time notifications
- Escalation procedures
- Integration with monitoring tools

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Redis (optional, for caching)

### Installation

1. **Install dependencies**:
   ```bash
   cd backend && npm install
   cd ../student-pass-frontend && npm install
   ```

2. **Configure environment**:
   ```bash
   cp backend/.env.example backend/.env
   # Update database and other configurations
   ```

3. **Run database migrations**:
   ```bash
   cd backend
   npx prisma migrate dev
   ```

4. **Start development servers**:
   ```bash
   # Backend
   cd backend && npm run dev
   
   # Frontend (in another terminal)
   cd student-pass-frontend && npm run dev
   ```

5. **Access the dashboard**:
   - Frontend: http://localhost:3000
   - Analytics API: http://localhost:5000/api/analytics
   - GraphQL Playground: http://localhost:5000/graphql

## Configuration

### Environment Variables

#### Backend (.env)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/student_pass_db"
JWT_SECRET="your-jwt-secret"
REDIS_URL="redis://localhost:6379"
PORT=5000
NODE_ENV=development
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=ws://localhost:5000
```

## Troubleshooting

### Common Issues

1. **Real-time updates not working**
   - Check WebSocket connection
   - Verify authentication tokens
   - Ensure proper CORS configuration

2. **Charts not rendering**
   - Verify Chart.js dependencies
   - Check browser console for errors
   - Ensure data format compatibility

3. **Slow dashboard loading**
   - Enable caching
   - Optimize database queries
   - Check network connectivity

4. **Export not working**
   - Verify file permissions
   - Check available disk space
   - Ensure proper authentication

### Performance Optimization

1. **Database Indexing**
   ```sql
   CREATE INDEX idx_applications_created_at ON student_applications(appliedAt);
   CREATE INDEX idx_access_logs_time ON access_logs(accessTime);
   CREATE INDEX idx_students_school ON students(schoolId);
   ```

2. **Redis Configuration**
   - Increase memory allocation
   - Configure appropriate eviction policies
   - Monitor memory usage

3. **Frontend Optimization**
   - Enable service workers
   - Implement code splitting
   - Optimize bundle size

## Support

For technical support or feature requests, please:

1. Check the troubleshooting guide above
2. Review the API documentation
3. Search existing issues in the repository
4. Contact the development team

## License

This project is licensed under the MIT License - see the LICENSE file for details.
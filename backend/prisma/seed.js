"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seeding...');
    // Create permissions
    const permissions = [
        // User management
        { name: 'users:create', description: 'Create users', resource: 'user', action: 'create' },
        { name: 'users:read', description: 'View users', resource: 'user', action: 'read' },
        { name: 'users:update', description: 'Update users', resource: 'user', action: 'update' },
        { name: 'users:delete', description: 'Delete users', resource: 'user', action: 'delete' },
        // Student management
        { name: 'students:create', description: 'Create students', resource: 'student', action: 'create' },
        { name: 'students:read', description: 'View students', resource: 'student', action: 'read' },
        { name: 'students:update', description: 'Update students', resource: 'student', action: 'update' },
        { name: 'students:delete', description: 'Delete students', resource: 'student', action: 'delete' },
        // Application management
        { name: 'applications:create', description: 'Create applications', resource: 'application', action: 'create' },
        { name: 'applications:read', description: 'View applications', resource: 'application', action: 'read' },
        { name: 'applications:update', description: 'Update applications', resource: 'application', action: 'update' },
        { name: 'applications:delete', description: 'Delete applications', resource: 'application', action: 'delete' },
        { name: 'applications:review', description: 'Review applications', resource: 'application', action: 'review' },
        // Pass management
        { name: 'passes:create', description: 'Issue passes', resource: 'pass', action: 'create' },
        { name: 'passes:read', description: 'View passes', resource: 'pass', action: 'read' },
        { name: 'passes:update', description: 'Update passes', resource: 'pass', action: 'update' },
        { name: 'passes:delete', description: 'Delete passes', resource: 'pass', action: 'delete' },
        { name: 'passes:revoke', description: 'Revoke passes', resource: 'pass', action: 'revoke' },
        // Access control
        { name: 'access:verify', description: 'Verify access', resource: 'access', action: 'verify' },
        { name: 'access:logs', description: 'View access logs', resource: 'access', action: 'logs' },
        // File management
        { name: 'files:upload', description: 'Upload files', resource: 'file', action: 'upload' },
        { name: 'files:delete', description: 'Delete files', resource: 'file', action: 'delete' },
        // School management
        { name: 'schools:create', description: 'Create schools', resource: 'school', action: 'create' },
        { name: 'schools:read', description: 'View schools', resource: 'school', action: 'read' },
        { name: 'schools:update', description: 'Update schools', resource: 'school', action: 'update' },
        { name: 'schools:delete', description: 'Delete schools', resource: 'school', action: 'delete' },
    ];
    console.log('Creating permissions...');
    for (const permission of permissions) {
        await prisma.permission.upsert({
            where: { name: permission.name },
            update: {},
            create: permission,
        });
    }
    // Create roles
    const roles = [
        {
            name: 'super_admin',
            description: 'Super administrator with full system access',
            permissions: permissions.map(p => p.name), // All permissions
        },
        {
            name: 'school_admin',
            description: 'School administrator with school-level access',
            permissions: [
                'users:create', 'users:read', 'users:update', 'users:delete',
                'students:create', 'students:read', 'students:update', 'students:delete',
                'applications:read', 'applications:update', 'applications:review',
                'passes:create', 'passes:read', 'passes:update', 'passes:revoke',
                'access:verify', 'access:logs',
                'files:upload', 'files:delete',
                'schools:read', 'schools:update',
            ],
        },
        {
            name: 'staff',
            description: 'School staff with limited administrative access',
            permissions: [
                'students:read', 'students:update',
                'applications:read', 'applications:update', 'applications:review',
                'passes:read', 'passes:update',
                'access:verify', 'access:logs',
                'files:upload',
            ],
        },
        {
            name: 'student',
            description: 'Student with basic access rights',
            permissions: [
                'applications:create', 'applications:read', 'applications:update',
                'passes:read',
                'files:upload',
            ],
        },
    ];
    console.log('Creating roles...');
    for (const roleData of roles) {
        const role = await prisma.role.upsert({
            where: { name: roleData.name },
            update: { description: roleData.description },
            create: {
                name: roleData.name,
                description: roleData.description,
            },
        });
        // Assign permissions to role
        for (const permissionName of roleData.permissions) {
            const permission = await prisma.permission.findUnique({
                where: { name: permissionName },
            });
            if (permission) {
                await prisma.rolePermission.upsert({
                    where: {
                        roleId_permissionId: {
                            roleId: role.id,
                            permissionId: permission.id,
                        },
                    },
                    update: {},
                    create: {
                        roleId: role.id,
                        permissionId: permission.id,
                    },
                });
            }
        }
    }
    // Create sample schools
    const schools = [
        {
            name: 'University of Lagos',
            code: 'UNILAG',
            address: 'Akoka, Lagos State, Nigeria',
            phone: '+234-1-2345678',
            email: 'info@unilag.edu.ng',
            website: 'https://unilag.edu.ng',
        },
        {
            name: 'Ahmadu Bello University',
            code: 'ABU',
            address: 'Zaria, Kaduna State, Nigeria',
            phone: '+234-69-550553',
            email: 'info@abu.edu.ng',
            website: 'https://abu.edu.ng',
        },
        {
            name: 'Obafemi Awolowo University',
            code: 'OAU',
            address: 'Ile-Ife, Osun State, Nigeria',
            phone: '+234-36-230290',
            email: 'info@oauife.edu.ng',
            website: 'https://oauife.edu.ng',
        },
    ];
    console.log('Creating schools...');
    const createdSchools = [];
    for (const school of schools) {
        const createdSchool = await prisma.school.upsert({
            where: { code: school.code },
            update: {},
            create: school,
        });
        createdSchools.push(createdSchool);
    }
    // Create departments for each school
    const departments = [
        { name: 'Computer Science', code: 'CS' },
        { name: 'Engineering', code: 'ENG' },
        { name: 'Medicine', code: 'MED' },
        { name: 'Law', code: 'LAW' },
        { name: 'Business Administration', code: 'BUS' },
    ];
    console.log('Creating departments...');
    for (const school of createdSchools) {
        for (const dept of departments) {
            await prisma.department.upsert({
                where: {
                    schoolId_code: {
                        schoolId: school.id,
                        code: dept.code,
                    },
                },
                update: {},
                create: {
                    name: dept.name,
                    code: dept.code,
                    schoolId: school.id,
                    headName: `Head of ${dept.name}`,
                },
            });
        }
    }
    // Create admin users
    const adminPassword = await bcryptjs_1.default.hash('admin123456', 12);
    const superAdminRole = await prisma.role.findUnique({ where: { name: 'super_admin' } });
    const schoolAdminRole = await prisma.role.findUnique({ where: { name: 'school_admin' } });
    console.log('Creating admin users...');
    // Create super admin
    await prisma.user.upsert({
        where: { email: 'superadmin@studentpass.com' },
        update: {},
        create: {
            email: 'superadmin@studentpass.com',
            passwordHash: adminPassword,
            firstName: 'Super',
            lastName: 'Administrator',
            roleId: superAdminRole.id,
            isActive: true,
            emailVerifiedAt: new Date(),
        },
    });
    // Create school admins for each school
    for (const school of createdSchools) {
        const email = `admin@${school.code.toLowerCase()}.edu.ng`;
        await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                email,
                passwordHash: adminPassword,
                firstName: school.code,
                lastName: 'Administrator',
                roleId: schoolAdminRole.id,
                schoolId: school.id,
                isActive: true,
                emailVerifiedAt: new Date(),
            },
        });
    }
    // Create access points
    console.log('Creating access points...');
    for (const school of createdSchools) {
        const accessPoints = [
            { name: 'Main Gate', location: 'Campus Main Entrance', accessType: 'both' },
            { name: 'Library Entrance', location: 'University Library', accessType: 'both' },
            { name: 'Hostel Gate', location: 'Student Hostel Complex', accessType: 'both' },
            { name: 'Admin Block', location: 'Administrative Building', accessType: 'entry' },
        ];
        for (const ap of accessPoints) {
            await prisma.accessPoint.create({
                data: {
                    name: ap.name,
                    location: ap.location,
                    accessType: ap.accessType,
                    schoolId: school.id,
                    deviceId: `${school.code}_${ap.name.replace(/\s+/g, '_').toUpperCase()}`,
                    isActive: true,
                },
            });
        }
    }
    console.log('✅ Database seeding completed successfully!');
    console.log('');
    console.log('Default accounts created:');
    console.log('Super Admin: superadmin@studentpass.com / admin123456');
    console.log('School Admins:');
    for (const school of createdSchools) {
        console.log(`  ${school.name}: admin@${school.code.toLowerCase()}.edu.ng / admin123456`);
    }
}
main()
    .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map
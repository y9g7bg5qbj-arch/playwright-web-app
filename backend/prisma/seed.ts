/**
 * Database Seed Script
 *
 * Creates dummy data for development and testing:
 * - A default user
 * - A sample project
 * - Test data sheets with rows
 *
 * Run with: npx prisma db seed
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...\n');

    // Create or find default user
    const userId = '4a6ceb7d-9883-44e9-bfd3-6a1cd2557ffc'; // Matches dev auth bypass
    let user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
        user = await prisma.user.create({
            data: {
                id: userId,
                email: 'dev@example.com',
                passwordHash: 'dev-hash-not-for-production',
                name: 'Development User'
            }
        });
        console.log('✅ Created default user:', user.email);
    } else {
        console.log('ℹ️  Default user already exists:', user.email);
    }

    // Create sample project
    const projectId = 'demo-project-001';
    let project = await prisma.project.findUnique({ where: { id: projectId } });

    if (!project) {
        project = await prisma.project.create({
            data: {
                id: projectId,
                userId: user.id,
                name: 'Demo E-Commerce Project',
                description: 'Sample e-commerce test automation project',
                veroPath: null // Will be created dynamically
            }
        });
        console.log('✅ Created demo project:', project.name);
    } else {
        console.log('ℹ️  Demo project already exists:', project.name);
    }

    // Create test data sheets
    const sheets = [
        {
            name: 'LoginPageData',
            pageObject: 'LoginPage',
            description: 'Test data for login functionality',
            columns: [
                { name: 'email', type: 'string', required: true },
                { name: 'password', type: 'string', required: true },
                { name: 'expectedResult', type: 'string', required: false },
                { name: 'userType', type: 'string', required: false }
            ],
            rows: [
                { scenarioId: 'TC001', data: { email: 'admin@test.com', password: 'Admin123!', expectedResult: 'success', userType: 'admin' } },
                { scenarioId: 'TC002', data: { email: 'user@test.com', password: 'User123!', expectedResult: 'success', userType: 'regular' } },
                { scenarioId: 'TC003', data: { email: 'invalid@test.com', password: 'wrong', expectedResult: 'failure', userType: 'invalid' } },
                { scenarioId: 'TC004', data: { email: '', password: '', expectedResult: 'validation_error', userType: 'empty' } }
            ]
        },
        {
            name: 'ProductSearchData',
            pageObject: 'SearchPage',
            description: 'Test data for product search',
            columns: [
                { name: 'searchTerm', type: 'string', required: true },
                { name: 'category', type: 'string', required: false },
                { name: 'minPrice', type: 'number', required: false },
                { name: 'maxPrice', type: 'number', required: false },
                { name: 'expectedCount', type: 'number', required: false }
            ],
            rows: [
                { scenarioId: 'TC001', data: { searchTerm: 'laptop', category: 'Electronics', minPrice: 500, maxPrice: 2000, expectedCount: 15 } },
                { scenarioId: 'TC002', data: { searchTerm: 'headphones', category: 'Electronics', minPrice: 50, maxPrice: 500, expectedCount: 25 } },
                { scenarioId: 'TC003', data: { searchTerm: 'xyz123nonexistent', category: '', minPrice: 0, maxPrice: 0, expectedCount: 0 } }
            ]
        },
        {
            name: 'CheckoutData',
            pageObject: 'CheckoutPage',
            description: 'Test data for checkout process',
            columns: [
                { name: 'firstName', type: 'string', required: true },
                { name: 'lastName', type: 'string', required: true },
                { name: 'address', type: 'string', required: true },
                { name: 'city', type: 'string', required: true },
                { name: 'zipCode', type: 'string', required: true },
                { name: 'cardNumber', type: 'string', required: true },
                { name: 'cvv', type: 'string', required: true },
                { name: 'expiryDate', type: 'string', required: true }
            ],
            rows: [
                {
                    scenarioId: 'TC001',
                    data: {
                        firstName: 'John',
                        lastName: 'Doe',
                        address: '123 Main St',
                        city: 'New York',
                        zipCode: '10001',
                        cardNumber: '4111111111111111',
                        cvv: '123',
                        expiryDate: '12/25'
                    }
                },
                {
                    scenarioId: 'TC002',
                    data: {
                        firstName: 'Jane',
                        lastName: 'Smith',
                        address: '456 Oak Ave',
                        city: 'Los Angeles',
                        zipCode: '90001',
                        cardNumber: '5500000000000004',
                        cvv: '456',
                        expiryDate: '06/26'
                    }
                }
            ]
        },
        {
            name: 'UserRegistrationData',
            pageObject: 'RegistrationPage',
            description: 'Test data for user registration',
            columns: [
                { name: 'username', type: 'string', required: true },
                { name: 'email', type: 'string', required: true },
                { name: 'password', type: 'string', required: true },
                { name: 'confirmPassword', type: 'string', required: true },
                { name: 'dateOfBirth', type: 'string', required: false },
                { name: 'acceptTerms', type: 'boolean', required: true }
            ],
            rows: [
                {
                    scenarioId: 'TC001',
                    data: {
                        username: 'newuser1',
                        email: 'newuser1@test.com',
                        password: 'SecurePass123!',
                        confirmPassword: 'SecurePass123!',
                        dateOfBirth: '1990-01-15',
                        acceptTerms: true
                    }
                },
                {
                    scenarioId: 'TC002',
                    data: {
                        username: 'testuser2',
                        email: 'testuser2@test.com',
                        password: 'AnotherPass456!',
                        confirmPassword: 'AnotherPass456!',
                        dateOfBirth: '1985-06-20',
                        acceptTerms: true
                    }
                },
                {
                    scenarioId: 'TC003',
                    data: {
                        username: 'mismatch',
                        email: 'mismatch@test.com',
                        password: 'Pass123!',
                        confirmPassword: 'DifferentPass!',
                        dateOfBirth: '',
                        acceptTerms: false
                    }
                }
            ]
        }
    ];

    for (const sheetData of sheets) {
        // Check if sheet exists
        const existingSheet = await prisma.testDataSheet.findFirst({
            where: {
                projectId: project.id,
                name: sheetData.name
            }
        });

        if (existingSheet) {
            console.log(`ℹ️  Sheet "${sheetData.name}" already exists, skipping...`);
            continue;
        }

        // Create sheet
        const sheet = await prisma.testDataSheet.create({
            data: {
                projectId: project.id,
                name: sheetData.name,
                pageObject: sheetData.pageObject,
                description: sheetData.description,
                columns: JSON.stringify(sheetData.columns)
            }
        });
        console.log(`✅ Created sheet: ${sheet.name}`);

        // Create rows
        for (const rowData of sheetData.rows) {
            await prisma.testDataRow.create({
                data: {
                    sheetId: sheet.id,
                    scenarioId: rowData.scenarioId,
                    data: JSON.stringify(rowData.data),
                    enabled: true
                }
            });
        }
        console.log(`   └─ Added ${sheetData.rows.length} rows`);
    }

    console.log('\n✨ Database seed completed!\n');
    console.log('Project ID:', project.id);
    console.log('User ID:', user.id);
    console.log('\nYou can now use these in the Vero editor:');
    console.log('  TestData.LoginPageData.fromScenarioId("TC001").email');
    console.log('  TestData.ProductSearchData.count');
    console.log('  TestData.CheckoutData.getAll()');
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

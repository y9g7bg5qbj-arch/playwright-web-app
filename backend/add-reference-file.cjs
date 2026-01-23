const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
    // Read the vero content
    const content = fs.readFileSync('/tmp/VeroSyntaxReference.vero', 'utf-8');
    
    // Find the Development environment in Main Project
    const project = await prisma.project.findFirst({
        where: { name: 'Main Project' },
        include: {
            environments: {
                where: { name: 'Development' },
                include: {
                    folders: {
                        where: { name: 'Features' }
                    }
                }
            }
        }
    });
    
    if (!project) {
        console.log('Project not found');
        return;
    }
    
    const devEnv = project.environments[0];
    if (!devEnv) {
        console.log('Development environment not found');
        return;
    }
    
    const featuresFolder = devEnv.folders[0];
    if (!featuresFolder) {
        console.log('Features folder not found');
        return;
    }
    
    console.log('Found Features folder:', featuresFolder.id);
    
    // Check if file already exists
    const existing = await prisma.testFlow.findFirst({
        where: {
            name: 'VeroSyntaxReference.vero',
            folderId: featuresFolder.id
        }
    });
    
    if (existing) {
        // Update it
        await prisma.testFlow.update({
            where: { id: existing.id },
            data: { content }
        });
        console.log('Updated existing file');
    } else {
        // Create it
        await prisma.testFlow.create({
            data: {
                name: 'VeroSyntaxReference.vero',
                content,
                folderId: featuresFolder.id
            }
        });
        console.log('Created new file');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

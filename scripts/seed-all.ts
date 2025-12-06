import { execSync } from 'child_process';
import { join } from 'path';

const SEED_SCRIPTS_DIR = 'scripts/seed';

/**
 * Executes a given seed script.
 * @param scriptName The name of the seed script to execute.
 */
function runSeedScript(scriptName: string): void {
  const scriptPath = join(SEED_SCRIPTS_DIR, `${scriptName}.ts`);
  console.log(`\n🚀 Running seed script: ${scriptName}...`);
  try {
    // Using ts-node to execute TypeScript files directly
    execSync(`ts-node ${scriptPath}`, { stdio: 'inherit' });
    console.log(`✅ Successfully ran seed script: ${scriptName}`);
  } catch (error) {
    console.error(`❌ Error running seed script ${scriptName}:`, error);
    // Depending on requirements, you might want to exit or continue
    process.exit(1);
  }
}

/**
 * Main function to orchestrate all seed scripts.
 */
function seedAll(): void {
  console.log('🌟 Starting the master seed script...');

  // List of seed scripts to run in order.
  // Ensure the order reflects dependencies if any.
  const seedScripts = [
    '01-users',
    '02-organizations',
    '03-projects',
    '04-tasks',
    '05-comments',
    // Add more seed scripts here as needed
    // '06-notifications',
    // '07-settings',
  ];

  seedScripts.forEach(script => {
    runSeedScript(script);
  });

  console.log('\n🎉 All seed scripts have been executed successfully!');
}

// Execute the main seeding function
seedAll();
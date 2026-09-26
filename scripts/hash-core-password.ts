/**
 * Generate CORE_PROMPT_PASSWORD_HASH for .env (the password that unlocks editing
 * the core prompt in Admin > System Prompt).
 *
 *   npx tsx scripts/hash-core-password.ts
 *
 * The password is read from the terminal without echo. The output is a bcrypt hash,
 * base64-encoded so the `$` characters survive Next.js .env variable expansion.
 */
import bcrypt from 'bcryptjs';
import readline from 'readline';

function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    // Suppress echo of typed characters
    (rl as any)._writeToOutput = (s: string) => {
      if (s.includes(question)) process.stdout.write(s);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

(async () => {
  const password = await askHidden('Core prompt password: ');
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }
  const confirm = await askHidden('Confirm password: ');
  if (password !== confirm) {
    console.error('Passwords do not match.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  const encoded = Buffer.from(hash, 'utf8').toString('base64');
  console.log('\nAdd this line to .env, then restart the server:\n');
  console.log(`CORE_PROMPT_PASSWORD_HASH=${encoded}`);
})();

import fs from 'fs';
import path from 'path';

export default function globalSetup() {
  const scoresFile = path.resolve(__dirname, 'scores.json');
  if (fs.existsSync(scoresFile)) {
    fs.unlinkSync(scoresFile);
  }
}

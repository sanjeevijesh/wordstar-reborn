/**
 * Legacy File Parser
 * Designed to handle classic WordStar (.ws) and DOS text files.
 */

// Reads a file as an ArrayBuffer and converts WordStar high-bit encoding
export async function parseLegacyFile(file, options = {}) {
  const { cleanupMode = true } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const buffer = e.target.result;
      const view = new Uint8Array(buffer);
      let output = '';

      for (let i = 0; i < view.length; i++) {
        let byte = view[i];

        // WordStar sets the 8th bit (MSB) high for the last letter of a word 
        // or for soft carriage returns.
        // Strip the high bit (byte & 0x7F) to get standard ASCII.
        let charCode = byte & 0x7F;

        // Skip WordStar soft returns (often 0x8D 0x0A) if cleanup is true
        if (cleanupMode) {
          if (byte === 0x8D) continue; // Soft CR
          
          // Filter out typical non-printable control codes, except newlines & tabs
          if (charCode < 32 && charCode !== 9 && charCode !== 10 && charCode !== 13) {
            continue;
          }
        }

        output += String.fromCharCode(charCode);
      }

      // If cleanupMode is true, normalize line endings to standard \n
      if (cleanupMode) {
        output = output.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // Remove WordStar "dot commands" (lines starting with a dot followed by 2 chars, e.g. .MT)
        // output = output.replace(/^\.[a-zA-Z0-9]{2}.*$/gm, '');
      }

      resolve(output);
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

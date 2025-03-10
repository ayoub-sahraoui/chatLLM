// Empty polyfill for node:fs
export default {
  readFileSync: () => {
    throw new Error("fs.readFileSync is not supported in browser environments");
  },
  writeFileSync: () => {
    throw new Error(
      "fs.writeFileSync is not supported in browser environments"
    );
  },
};

// Polyfill for fs promises
export const promises = {
  readFile: async () => {
    throw new Error(
      "fs.promises.readFile is not supported in browser environments"
    );
  },
  writeFile: async () => {
    throw new Error(
      "fs.promises.writeFile is not supported in browser environments"
    );
  },
};

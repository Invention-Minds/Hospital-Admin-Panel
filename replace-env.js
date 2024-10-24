const fs = require('fs');
const targetPath = './src/environments/environment.prod.ts';
const envConfigFile = `
export const environment = {
  production: true,
  apiUrl: '${process.env.BACKEND_API_URL}'
};
`;

fs.writeFile(targetPath, envConfigFile, (err) => {
  if (err) {
    console.log('Error writing environment file', err);
  } else {
    console.log('Environment file written successfully');
  }
});

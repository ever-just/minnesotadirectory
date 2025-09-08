// Test Stack Auth React compatibility
import('@stackframe/react').then(stackAuth => {
  console.log('✅ Stack Auth React package imported successfully!');
  console.log('Available exports:', Object.keys(stackAuth));
}).catch(error => {
  console.log('❌ Stack Auth import failed:', error.message);
});

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const sourceUri = process.env.SOURCE_MONGO_URI || process.env.MONGO_URI;
const targetUri = process.env.TARGET_MONGO_URI || process.env.NEW_MONGO_URI;
const targetDbName = (process.env.TARGET_DB_NAME || '').trim();
const shouldDropTarget = String(process.env.DROP_TARGET_DB || 'false').trim().toLowerCase() === 'true';

const usage = [
  'MongoDB migration utility',
  '',
  'Required environment variables:',
  '  SOURCE_MONGO_URI or MONGO_URI',
  '  TARGET_MONGO_URI or NEW_MONGO_URI',
  '',
  'Optional environment variables:',
  '  TARGET_DB_NAME   Override the target database name.',
  '  DROP_TARGET_DB   Set to "true" to clear the target DB before import.',
  '',
  'Example (PowerShell):',
  '  $env:TARGET_MONGO_URI="mongodb+srv://user:password@cluster.mongodb.net/?appName=LumiereNeon"',
  '  $env:TARGET_DB_NAME="test"',
  '  npm run migrate:mongodb',
].join('\n');

if (process.argv.includes('--help')) {
  console.log(usage);
  process.exit(0);
}

if (!sourceUri || !targetUri) {
  console.error(usage);
  process.exit(1);
}

const buildConnectionOptions = (dbName) => (
  dbName
    ? { dbName }
    : {}
);

const cloneDocuments = (documents) => documents.map((document) => {
  if (!document || typeof document.toObject !== 'function') {
    return document;
  }

  return document.toObject({ depopulate: true });
});

async function main() {
  const sourceConnection = await mongoose.createConnection(sourceUri, buildConnectionOptions('')).asPromise();
  const resolvedSourceDbName = sourceConnection.db.databaseName;
  const resolvedTargetDbName = targetDbName || resolvedSourceDbName;
  const targetConnection = await mongoose.createConnection(
    targetUri,
    buildConnectionOptions(resolvedTargetDbName),
  ).asPromise();

  try {
    console.log(`Source DB: ${resolvedSourceDbName}`);
    console.log(`Target DB: ${resolvedTargetDbName}`);

    if (shouldDropTarget) {
      console.log('Dropping target database before import...');
      await targetConnection.dropDatabase();
    }

    const collections = await sourceConnection.db.listCollections({}, { nameOnly: true }).toArray();

    for (const collection of collections) {
      const collectionName = collection.name;

      if (collectionName.startsWith('system.')) {
        continue;
      }

      console.log(`Migrating ${collectionName}...`);
      const sourceCollection = sourceConnection.collection(collectionName);
      const targetCollection = targetConnection.collection(collectionName);
      const documents = await sourceCollection.find({}).toArray();

      await targetCollection.deleteMany({});

      if (documents.length > 0) {
        await targetCollection.insertMany(cloneDocuments(documents), { ordered: false });
      }

      console.log(`Migrated ${documents.length} document(s) into ${collectionName}.`);
    }

    console.log('MongoDB migration completed successfully.');
  } finally {
    await sourceConnection.close();
    await targetConnection.close();
  }
}

main().catch((error) => {
  console.error(`MongoDB migration failed: ${error.message}`);
  process.exit(1);
});

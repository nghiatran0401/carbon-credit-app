const fs = require('fs');
const path = require('path');
const solc = require('solc');

const contractsDir = path.join(process.cwd(), 'contracts');

function findImports(importPath) {
  const lookupPaths = [
    path.join(process.cwd(), 'node_modules', importPath),
    path.join(contractsDir, importPath),
    path.join(process.cwd(), importPath),
  ];

  for (const p of lookupPaths) {
    if (fs.existsSync(p)) {
      return { contents: fs.readFileSync(p, 'utf8') };
    }
  }

  return { error: `File not found: ${importPath}` };
}

function buildSources() {
  const files = fs
    .readdirSync(contractsDir)
    .filter((file) => file.endsWith('.sol'))
    .sort();

  const sources = {};
  for (const file of files) {
    const fullPath = path.join(contractsDir, file);
    sources[file] = { content: fs.readFileSync(fullPath, 'utf8') };
  }

  return sources;
}

const localSourceNames = Object.keys(buildSources());

const input = {
  language: 'Solidity',
  sources: Object.fromEntries(
    localSourceNames.map((name) => [name, { content: fs.readFileSync(path.join(contractsDir, name), 'utf8') }])
  ),
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

if (output.errors) {
  const errors = output.errors.filter((entry) => entry.severity === 'error');
  const warnings = output.errors.filter((entry) => entry.severity === 'warning');

  for (const warning of warnings) {
    console.warn(`⚠️  ${warning.formattedMessage}`);
  }

  if (errors.length > 0) {
    console.error('Compilation errors:', JSON.stringify(errors, null, 2));
    process.exit(1);
  }
}

let written = 0;
for (const [sourceName, contracts] of Object.entries(output.contracts)) {
  if (!localSourceNames.includes(sourceName)) {
    continue;
  }

  for (const [contractName, contract] of Object.entries(contracts)) {
    const artifact = {
      abi: contract.abi,
      bytecode: '0x' + contract.evm.bytecode.object,
    };

    const outPath = path.join(contractsDir, `${contractName}.json`);
    fs.writeFileSync(outPath, JSON.stringify(artifact, null, 2));

    console.log(`✅ ${contractName} compiled from ${sourceName}`);
    console.log(`   ABI: ${contract.abi.length} entries`);
    console.log(`   Bytecode: ${artifact.bytecode.length} chars`);

    written += 1;
  }
}

if (written === 0) {
  console.error('No contracts were compiled.');
  process.exit(1);
}

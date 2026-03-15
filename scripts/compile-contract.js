const solc = require('solc');
const fs = require('fs');

const source = fs.readFileSync('contracts/AuditAnchor.sol', 'utf8');

const input = {
  language: 'Solidity',
  sources: { 'AuditAnchor.sol': { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  const errors = output.errors.filter((e) => e.severity === 'error');
  if (errors.length > 0) {
    console.error('Compilation errors:', JSON.stringify(errors, null, 2));
    process.exit(1);
  }
}

const contract = output.contracts['AuditAnchor.sol']['AuditAnchor'];
const artifact = {
  abi: contract.abi,
  bytecode: '0x' + contract.evm.bytecode.object,
};

fs.writeFileSync('contracts/AuditAnchor.json', JSON.stringify(artifact, null, 2));
console.log('✅ AuditAnchor compiled successfully');
console.log(`   ABI: ${contract.abi.length} entries`);
console.log(`   Bytecode: ${artifact.bytecode.length} chars`);

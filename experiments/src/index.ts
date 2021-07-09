const fs = require('fs');
const readline = require('readline');

async function main() {
    console.log(`${process.cwd()}`);

    const file1 = '../log-580000-600000.txt';
    const file2 = '../log-600000-624342.txt';

    const readInterface = readline.createInterface({
        input: fs.createReadStream(file1),
        console: false
    });

    for await (const line of readInterface) {
        const transaction = JSON.parse(line);
        if (transaction.events.length > 2) {
            console.log(transaction.block.blockNumber);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => process.exit());

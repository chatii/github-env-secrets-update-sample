import {Octokit} from "octokit";
import * as dotenv from "dotenv";
import * as _sodium from "libsodium-wrappers";

dotenv.config();

const githubPAT = process.env['GITHUB_PERSONAL_ACCESS_TOKEN'];
const repositoryName = 'github-env-secrets-update-sample';
const repositoryOwner = 'chatii';
const environmentName = 'test_env';

const secretString = 'this-is-secrets-test';
const secretName = 'TEST_SECRET';

const octokit = new Octokit({auth: githubPAT});

const encryptValue = async (valueToEncrypt: string, key: string) => {
    async function async_encrypt(messageBytes: Buffer, publicKey: Buffer) {
        await _sodium.ready;
        return _sodium.crypto_box_seal(messageBytes, publicKey);
    }

    const messageBytes = Buffer.from(valueToEncrypt);
    const keyBytes = Buffer.from(key, 'base64');

    const encryptedBytes = await async_encrypt(messageBytes, keyBytes);

    return Buffer.from(encryptedBytes).toString('base64');
};

(async () => {
    const { data: repository } = await octokit.request('GET /repos/{owner}/{repo}', {
        owner: repositoryOwner,
        repo: repositoryName,
    });
    const {data: publicKey} = await octokit.request('GET /repositories/{repository_id}/environments/{environment_name}/secrets/public-key', {
        repository_id: repository.id,
        environment_name: environmentName,
    });
    console.log(publicKey);

    const encryptedSecret = await encryptValue(secretString, publicKey.key);
    console.log(encryptedSecret);

    const putResult = await octokit.request('PUT /repositories/{repository_id}/environments/{environment_name}/secrets/{secret_name}', {
        repository_id: repository.id,
        environment_name: environmentName,
        secret_name: secretName,
        encrypted_value: encryptedSecret,
        key_id: publicKey.key_id,
    });

    console.log(putResult);
})();

/*
 *
 * Copyright 2018-present NEM
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import {
    Account,
    AggregateTransaction,
    Deadline,
    HashLockTransaction,
    KeyGenerator,
    Listener,
    MetadataHttp,
    MetadataTransactionService,
    MetadataType,
    Mosaic,
    MosaicId,
    NetworkType,
    PublicAccount,
    SignedTransaction,
    TransactionService,
    UInt64,
} from 'nem2-sdk';
import {of} from 'rxjs';
import {mergeMap} from 'rxjs/operators';

/* start block 01 */
// replace with network type
const networkType = NetworkType.TEST_NET;
// replace with bob private key
const bobPrivateKey = '0000000000000000000000000000000000000000000000000000000000000000';
const bobAccount = Account.createFromPrivateKey(bobPrivateKey, networkType);
// replace with alice public key
const alicePublicKey = 'E59EF184A612D4C3C4D89B5950EB57262C69862B2F96E59C5043BF41765C482F';
const alicePublicAccount = PublicAccount.createFromPublicKey(alicePublicKey, networkType);
// replace with node endpoint
const nodeUrl = 'http://api-harvest-20.us-west-1.nemtech.network:3000';
const metadataHttp = new MetadataHttp(nodeUrl);
const metadataService = new MetadataTransactionService(metadataHttp);

// replace with key and new value
const key = KeyGenerator.generateUInt64Key('CERT');
const newValue = '000000';

const accountMetadataTransaction = metadataService.createMetadataTransaction(
    Deadline.create(),
    networkType,
    MetadataType.Account,
    alicePublicAccount,
    key,
    newValue,
    bobAccount.publicAccount);
/* end block 01 */

/* start block 02 */
// replace with meta.generationHash (nodeUrl + '/block/1')
const networkGenerationHash = 'CC42AAD7BD45E8C276741AB2524BC30F5529AF162AD12247EF9A98D6B54A385B';
const signedAggregateTransaction = accountMetadataTransaction
    .pipe(
        mergeMap((transaction) => {
            const aggregateTransaction = AggregateTransaction.createComplete(
                Deadline.create(),
                [transaction.toAggregate(bobAccount.publicAccount)],
                networkType,
                [],
                UInt64.fromUint(2000000));
            const signedTransaction = bobAccount.sign(aggregateTransaction, networkGenerationHash);
            return of(signedTransaction);
        }));
/* end block 02 */

/* start block 03 */
interface SignedAggregateHashLock {
    readonly aggregate: SignedTransaction;
    readonly hashLock: SignedTransaction;
}

// replace with nem.xem id
const networkCurrencyMosaicId = new MosaicId('75AF035421401EF0');
// replace with network currency divisibility
const networkCurrencyDivisibility = 6;

const signedAggregateHashLock = signedAggregateTransaction.pipe(
    mergeMap((signedAggregateTransaction) => {
        const hashLockTransaction = HashLockTransaction.create(
            Deadline.create(),
            new Mosaic(networkCurrencyMosaicId,
                UInt64.fromUint(10 * Math.pow(10, networkCurrencyDivisibility))),
            UInt64.fromUint(480),
            signedAggregateTransaction,
            networkType,
            UInt64.fromUint(2000000));
        const signedTransaction = bobAccount.sign(hashLockTransaction, networkGenerationHash);
        const signedAggregateHashLock: SignedAggregateHashLock = {
            aggregate: signedAggregateTransaction,
            hashLock: signedTransaction,
        };
        console.log('Aggregate Transaction Hash:', signedAggregateTransaction.hash + '\n');
        console.log('HashLock Transaction Hash:', signedTransaction.hash + '\n');
        return of(signedAggregateHashLock);
    }));
/* end block 03 */

/* start block 04 */
const listener = new Listener(nodeUrl);
const transactionService = new TransactionService(nodeUrl);

listener.open().then(() => {
    signedAggregateHashLock.pipe(
        mergeMap((signedAggregateHashLock) =>
            transactionService.announceHashLockAggregateBonded(
                signedAggregateHashLock.hashLock,
                signedAggregateHashLock.aggregate,
                listener),
        ),
    ).subscribe((ignored) => console.log('Transaction confirmed'),
                (err) => console.log(err));
});
/* end block 04 */

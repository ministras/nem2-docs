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

package nem2.guides.examples.aggregate;

import io.nem.sdk.api.AccountRepository;
import io.nem.sdk.api.RepositoryFactory;
import io.nem.sdk.api.TransactionRepository;
import io.nem.sdk.infrastructure.vertx.RepositoryFactoryVertxImpl;
import io.nem.sdk.model.account.Account;
import io.nem.sdk.model.blockchain.NetworkType;
import io.nem.sdk.model.transaction.CosignatureSignedTransaction;
import io.nem.sdk.model.transaction.CosignatureTransaction;
import java.util.concurrent.ExecutionException;
import org.junit.jupiter.api.Test;

class CosigningAggregateBondedTransactions {

    @Test
    void cosigningAnnouncedAggregateBondedTransactions()
        throws ExecutionException, InterruptedException {
        try (final RepositoryFactory repositoryFactory = new RepositoryFactoryVertxImpl(
            "http://localhost:3000")) {

            final NetworkType networkType = repositoryFactory.getNetworkType().toFuture().get();

            final TransactionRepository transactionRepository = repositoryFactory
                .createTransactionRepository();

            /* start block 02 */
            // Replace with a private key
            final String privateKey = "";

            final Account account = Account.createFromPrivateKey(privateKey, networkType);

            AccountRepository accountRepository = repositoryFactory.createAccountRepository();
            accountRepository.aggregateBondedTransactions(account.getPublicAccount())
                .flatMapIterable(
                    tx -> tx) // Transform transaction array to single transactions to process them
                .filter(tx -> !tx.signedByAccount(account.getPublicAccount()))
                .map(tx -> {
                    final CosignatureTransaction cosignatureTransaction = CosignatureTransaction
                        .create(tx);

                    final CosignatureSignedTransaction cosignatureSignedTransaction = account
                        .signCosignatureTransaction(cosignatureTransaction);

                    return transactionRepository
                        .announceAggregateBondedCosignature(cosignatureSignedTransaction).toFuture()
                        .get();
                })
                .toFuture()
                .get();
            /* end block 02 */
        }
    }
}

/* ********** Database CRUD Operations and Miscellaneous ********** */

// insert
async function addMember(client, databaseAndCollection, application) {
    try {
        await client.connect();
        const result = await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .insertOne(application);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

// get
async function getMember(client, databaseAndCollection, filter) {
    let result;

    try {
        await client.connect();
        result = await client.db(databaseAndCollection.db)
                    .collection(databaseAndCollection.collection)
                    .findOne(filter);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
        return result;
    }
}

async function removeMember(client, databaseAndCollection, filter) {
    let result;

    try {
        await client.connect();
        result = await client.db(databaseAndCollection.db)
                    .collection(databaseAndCollection.collection)
                    .deleteOne(filter);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
        return result;
    }
}


module.exports = { addMember, getMember, removeMember };
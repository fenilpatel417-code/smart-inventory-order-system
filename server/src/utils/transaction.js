const mongoose = require('mongoose');

/**
 * Runs operations within a MongoDB transaction if replica set is available,
 * or runs directly with session/fallback for standalone MongoDB instances.
 * @param {Function} callback - Function receiving (session)
 */
const runInTransaction = async (callback) => {
  const session = await mongoose.startSession();
  try {
    // Check if connected client topology has a replica set
    const topology = mongoose.connection.client?.topology?.description;
    const isReplicaSet = topology?.setName || (topology?.type && topology.type.includes('ReplicaSet'));

    if (isReplicaSet) {
      let result;
      await session.withTransaction(async () => {
        result = await callback(session);
      });
      return result;
    } else {
      // Standalone MongoDB fallback
      return await callback(session);
    }
  } catch (error) {
    throw error;
  } finally {
    await session.endSession();
  }
};

module.exports = { runInTransaction };

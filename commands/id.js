module.exports = {
    name: 'id',
    description: 'Alias untuk gid (Group ID)',
    adminOnly: true,
    execute: async (context) => {
        const gidCmd = require('./gid');
        await gidCmd.execute(context);
    }
};

module.exports = {
  apps: [
    {
      name: "leader",
      script: "gateway.js",
      wait_ready: true,
      exec_mode: "cluster",
      env: {
        NAME: "leader",
        PORT: 4000,
      },
    },
    {
      name: "follower",
      script: "gateway.js",
      wait_ready: true,
      exec_mode: "cluster",
      env: {
        NAME: "follower",
        PORT: 4000,
      },
    },
    {
      script: "updater.js",
    },
  ],
};

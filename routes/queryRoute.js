const express = require("express");
const router = express.Router();
const { handleQuery } = require("../controllers/queryController");
router.post("/", handleQuery);
module.exports = router;

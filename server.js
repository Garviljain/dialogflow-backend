const express = require("express");
const app = express();
const cors = require("cors");
const emailRouter = require("./routes/emailRoute");
const queryRouter = require("./routes/queryRoute");
app.use(express.json());
require("dotenv").config();
app.use(
	cors({
		origin: "http://localhost:5173",
	})
);
// Instantiates a session client
app.get("/", (req, res) => {
	res.send("hello world");
});
app.use("/query", queryRouter);
app.use("/email", emailRouter);
app.listen(3000, (err) => {
	if (err) {
		console.log(err);
	}
	console.log(`listening to port 3000`);
});

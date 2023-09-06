const express = require("express");
const app = express();
const cors = require("cors");
const hostelInfo = require("./hostelInfo.json");
app.use(express.json());
const dialogflow = require("@google-cloud/dialogflow");
app.use(
	cors({
		origin: "http://localhost:5173",
	})
);
// Instantiates a session client
const sessionClient = new dialogflow.SessionsClient();
const projectId = "hello-byvu";
const sessionId = "123456";
const queries = ["hi"];
const languageCode = "en";
async function detectIntent(
	projectId,
	sessionId,
	query,
	contexts,
	languageCode
) {
	// The path to identify the agent that owns the created intent.
	const sessionPath = sessionClient.projectAgentSessionPath(
		projectId,
		sessionId
	);

	// The text query request.
	const request = {
		session: sessionPath,
		queryInput: {
			text: {
				text: query,
				languageCode: languageCode,
			},
		},
	};

	if (contexts && contexts.length > 0) {
		request.queryParams = {
			contexts: contexts,
		};
	}

	const responses = await sessionClient.detectIntent(request);
	return responses[0];
}

async function executeQueries(projectId, sessionId, queries, languageCode) {
	// Keeping the context across queries let's us simulate an ongoing conversation with the bot
	let context;
	let intentResponse;
	for (const query of queries) {
		try {
			intentResponse = await detectIntent(
				projectId,
				sessionId,
				query,
				context,
				languageCode
			);
			context = intentResponse.queryResult.outputContexts;
		} catch (error) {
			console.log(error);
			reject(error);
		}
	}
	console.log(intentResponse?.queryResult?.intent?.displayName)
	if (intentResponse?.queryResult?.intent?.displayName == "warden_name") {
		const hostelName = intentResponse?.queryResult?.parameters?.fields?.hostel_name?.stringValue;
		return {message: `The warden of ${hostelName} is ${hostelInfo[hostelName]}.`, res: intentResponse};
	}
	return {message: intentResponse?.queryResult?.fulfillmentMessages[0].text.text[0], res: intentResponse};
}
app.post("/query", async (req, res) => {
	const { queries } = req.body;
	if (!queries) return res.json({ message: "No query sent" }).status(404);
	console.log(queries)
	try {
		const response = await executeQueries(
			projectId,
			sessionId,
			queries,
			languageCode
		);
		return res.json(response).status(200);
	} catch (error) {
		console.log(error);
		return res.json(error);
	}
});
app.get("/", (req, res) => {
	res.send("hello world");
})
app.listen(3000, (err) => {
	if (err) {
		console.log(err);
	}
	console.log(`listening to port 3000`);
});

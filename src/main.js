var https = require("https");
var http = require("http");
var express = require("express");
var bodyParser = require("body-parser");
var databox = require("node-databox");

const DATABOX_ARBITER_ENDPOINT = process.env.DATABOX_ARBITER_ENDPOINT || 'tcp://127.0.0.1:4444';
const DATABOX_ZMQ_ENDPOINT = process.env.DATABOX_ZMQ_ENDPOINT || "tcp://127.0.0.1:5555";
const DATABOX_TESTING = !(process.env.DATABOX_VERSION);
const PORT = process.env.port || '8080';

const store = databox.NewStoreClient(DATABOX_ZMQ_ENDPOINT, DATABOX_ARBITER_ENDPOINT);

//create store schema for saving key/value config data
const configMetadata = {
    ...databox.NewDataSourceMetadata(),
    Description: 'spendingalarm config',
    ContentType: 'application/json',
    Vendor: 'Databox Inc.',
    DataSourceType: 'spendingalarmDriverConfig',
    DataSourceID: 'spendingalarmDriverConfig',
    StoreType: 'kv',
}

//create store schema alarms
const reportsMetadata = {
    ...databox.NewDataSourceMetadata(),
    Description: 'spendingalaram reports',
    ContentType: 'application/json',
    Vendor: 'Databox Inc.',
    DataSourceType: 'spendingalarmReports',
    DataSourceID: 'spendingalarmReports',
    StoreType: 'ts/blob',
    IsActuator: true
}

///now create our stores using our clients.
store.RegisterDatasource(configMetadata).then(() => {
	console.log("registered spendingalarmConfig");
	//now register the output (reports)
	return store.RegisterDatasource(reportsMetadata)
}).then(() => {
	console.log("registered spendingalarm report")
	// no DATABOX_TESTING for now
	if (DATABOX_TESTING) 
		throw('DATABOX_TESTING not supported');
	return tstore.TSBlob.Observe(reportsMetadata.DataSourceID, 0); 
}).then((emitter) => {
	console.log("started listening to ", reportsMetadata.DataSourceID);

	emitter.on('data', (data) => {
		console.log("new report:", data);
		// TODO write ....
	});

	emitter.on('error', (err) => {
		console.warn("error (reports observer)", err);
	});

}).catch((err) => { 
	console.log("error setting up datasources", err) 
})

//set up webserver to serve driver endpoints
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('views', './views');
app.set('view engine', 'ejs');

app.get("/", function (req, res) {
    res.redirect("/ui");
});

app.get("/ui", function (req, res) {
    store.KV.Read(configMetadata.DataSourceID, "config").then((result) => {
        console.log("ui get config:", configMetadata.DataSourceID, result);
        res.render('index', { config: result.value });
    }).catch((err) => {
        console.log("get config error", err);
        res.send({ success: false, err });
    });
});

app.post('/ui/setConfig', (req, res) => {

    const config = req.body.config;

    return new Promise((resolve, reject) => {
        store.KV.Write(configMetadata.DataSourceID, "config", { value: config }).then(() => {
            console.log("config successfully written!", config);
            resolve();
        }).catch((err) => {
            console.log("failed to write config", err);
            reject(err);
        });
    }).then(() => {
        res.send({ success: true });
    });
});

app.get("/status", function (req, res) {
    res.send("active");
});

//when testing, we run as http, (to prevent the need for self-signed certs etc);
if (DATABOX_TESTING) {
    console.log("[Creating TEST http server]", PORT);
    http.createServer(app).listen(PORT);
} else {
    console.log("[Creating https server]", PORT);
    const credentials = databox.GetHttpsCredentials();
    https.createServer(credentials, app).listen(PORT);
}

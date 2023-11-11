require("dotenv").config();

const PROTO_PATH = __dirname + '/../protos/vrf.proto';

const grpcServer = "34.27.65.206:50051";
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const options = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
};

const {
    APPLICATION_ADDRESS
} = process.env;

const packageDefinition = protoLoader.loadSync(PROTO_PATH, options);
const VrfService = grpc.loadPackageDefinition(packageDefinition).vrf.VrfService;
const client = new VrfService(grpcServer, grpc.credentials.createInsecure());

const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

app.get("/pubkey", async (_req, res) => {
    const resp = await new Promise((resolve, reject) => client.generateKeys({}, function (err, response) {
        if (err) {
            return reject(err)
        }
        resolve(response)
    }));

    res.send({ publicKey: resp.data.toString("hex") });
});

app.get("/generateRandom", async (req, res) => {
    let pkey = req.query.publicKey;
    if (pkey.length === 128) {
        pkey = "04" + pkey;
    }
    const d = Buffer.from(pkey, "hex");
    const resp = await new Promise((resolve, reject) => client.generateRandomNumber({ data: d }, function (err, response) {
        if (err) {
            return reject(err)
        }
        resolve(response)
    }));

    res.send({
        applicationAddress: APPLICATION_ADDRESS,
        messageHash: "0x" + resp.proof_msg.toString("hex"),
        signature: "0x" + resp.proof_sig.toString("hex"),
        v: "0x" + resp.recovery_id.toString("hex"),
        expectedRandom: "0x" + resp.random_number.toString("hex"),
    });
})

app.listen(port, () => {
    console.log(`vrf server listening at http://localhost:${port}`);
});

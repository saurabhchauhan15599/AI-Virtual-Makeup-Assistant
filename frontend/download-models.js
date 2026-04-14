const fs = require("fs");
const path = require("path");
const https = require("https");

// Configure HTTPS agent to handle SSL certificate issues
const httpsAgent = new https.Agent({
    rejectUnauthorized: false, // This allows self-signed certificates
});

// Create models directory if it doesn't exist
const modelsDir = path.join(__dirname, "public", "models");
if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
    console.log("Created models directory");
}

// Models to download
const models = [
    {
        name: "tiny_face_detector_model-weights_manifest.json",
        url: "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json",
    },
    {
        name: "tiny_face_detector_model-shard1",
        url: "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1",
    },
    {
        name: "face_landmark_68_model-weights_manifest.json",
        url: "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json",
    },
    {
        name: "face_landmark_68_model-shard1",
        url: "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1",
    },
    {
        name: "face_recognition_model-weights_manifest.json",
        url: "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json",
    },
    {
        name: "face_recognition_model-shard1",
        url: "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1",
    },
    {
        name: "face_recognition_model-shard2",
        url: "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard2",
    },
];

// Download function
const downloadFile = (url, filePath) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filePath);

        const options = {
            agent: httpsAgent,
            timeout: 30000, // 30 second timeout
        };

        https
            .get(url, options, (response) => {
                // Handle redirects
                if (
                    response.statusCode >= 300 &&
                    response.statusCode < 400 &&
                    response.headers.location
                ) {
                    file.close();
                    fs.unlink(filePath, () => {});
                    return downloadFile(response.headers.location, filePath)
                        .then(resolve)
                        .catch(reject);
                }

                if (response.statusCode !== 200) {
                    file.close();
                    fs.unlink(filePath, () => {});
                    return reject(
                        new Error(
                            `HTTP ${response.statusCode}: ${response.statusMessage}`
                        )
                    );
                }

                response.pipe(file);

                file.on("finish", () => {
                    file.close();
                    console.log(
                        `✓ Successfully downloaded ${path.basename(filePath)}`
                    );
                    resolve();
                });

                file.on("error", (err) => {
                    fs.unlink(filePath, () => {});
                    reject(err);
                });
            })
            .on("error", (err) => {
                fs.unlink(filePath, () => {});
                reject(err);
            })
            .on("timeout", () => {
                fs.unlink(filePath, () => {});
                reject(new Error("Download timeout"));
            });
    });
};

// Download all models
const downloadModels = async () => {
    console.log("Downloading face-api.js models...");

    let successCount = 0;
    let failureCount = 0;

    for (const model of models) {
        const filePath = path.join(modelsDir, model.name);

        try {
            console.log(`Downloading ${model.name}...`);
            await downloadFile(model.url, filePath);
            successCount++;
        } catch (error) {
            console.error(`✗ Error downloading ${model.name}:`, error.message);
            failureCount++;
        }
    }

    console.log(`\nDownload Summary:`);
    console.log(`✓ Successfully downloaded: ${successCount} models`);
    console.log(`✗ Failed to download: ${failureCount} models`);

    if (failureCount === 0) {
        console.log("🎉 All models downloaded successfully!");
    } else {
        console.log(
            "⚠️  Some models failed to download. Please check the errors above."
        );
        process.exit(1);
    }
};

// Run the download
downloadModels();

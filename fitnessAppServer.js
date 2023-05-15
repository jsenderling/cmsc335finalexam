const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, '.env') });
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const portNumber = 5000;
const dbUtils = require("./databaseFunctions.js");

const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION};
const { MongoClient, ServerApiVersion } = require('mongodb');
const { resourceLimits } = require("worker_threads");
const uri = `mongodb+srv://${userName}:${password}@cluster0.3oefjxo.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

/* ********** Command line interpreter ********** */

console.log(`Web server started and running at http://localhost:${portNumber}`);
const prompt = "stop to shutdown the server: ";
process.stdout.write(prompt);
process.stdin.on('readable', () => {
    let input = String(process.stdin.read());
    if (input !== null) {
        let command = input.trim();

        if (command === "stop") {
            console.log("Shutting down the server");
            process.exit(0);
        } else {
            console.log(`Invalid Command: ${command}`);
        }

        process.stdout.write(prompt);
        process.stdin.resume();
    }
});

/* ********** Middleware processing ********** */

// set up views, bodyParser, static files
app.set("views", path.resolve(__dirname, "views"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('css'));

// index
app.get('/', (req, res) => {
    res.render("index", {});
});

// get request for member application endpoint
app.get('/becomeMember', (req, res) => {
    res.render("memberApp", { port: portNumber });
});

// post request for member application endpoint (display application confirmation)
app.post('/becomeMember', async (req, res) => {
    const application = { name: req.body.name, phone: `${req.body.phoneFirstPart}-${req.body.phoneSecondPart}-${req.body.phoneThirdPart}`,
                            email: req.body.email, gender: req.body.gender.toLowerCase(), age: req.body.age, height: req.body.height,
                            weight: req.body.weight, activitylevel: req.body.activityLevel }; 
    await dbUtils.addMember(client, databaseAndCollection, application);
    res.render("memberConfirm", application);
}); 

// get request for member search endpoint
app.get('/memberSearch', (req, res) => {
    res.render("searchMember", { port: portNumber, name: "", phone: "", email: "", gender: "", age: "", height: "",
                                    weight: "", activitylevel: "" });
}); 

// post request for member search endpoint (display member's info)
app.post('/memberSearch', async (req, res) => {
    let result = await dbUtils.getMember(client, databaseAndCollection, { name: req.body.name, email: req.body.email });
    
    if (!result) {
        const application = { port: portNumber, name: `<br><strong>No data because ${req.body.name} (email: ${req.body.email}) is not a member</strong>`, phone: "",
                                email: "", gender: "", age: "", height: "", weight: "", activitylevel: "" };
        res.render("searchMember", application);
    } else {
        const application = { port: portNumber, name: '<br><strong><span class="confirmHeader">General Information</span></strong><br><strong>Name: </strong>' + result.name + "<br>", phone: "<strong>Phone: </strong>" + result.phone + "<br>", 
                                email: "<strong>Email: </strong>" + result.email + "<br><hr>", gender: '<strong><span class="confirmHeader">Vital Characteristics</span></strong><br><strong>Gender: </strong>' + result.gender + "<br>", 
                                age: "<strong>Age: </strong>" + result.age + "<br>", height: "<strong>Height: </strong>" + result.height + "<em> cm</em><br>", 
                                weight: "<strong>Weight: </strong>" + result.weight + "<em> kg</em><br><hr>", 
                                activitylevel: '<strong><span class="confirmHeader">Exercise Levels</span></strong><br><strong>Activity Level: </strong>' + result.activitylevel }; 
        res.render("searchMember", application);
    }
});

// get request for end membership
app.get('/removeMember', (req, res) => {
    res.render("endMember", { port: portNumber, name: "", email: "" });
});

// post request for end membership
app.post('/removeMember', async (req, res) => {
    let result = await dbUtils.removeMember(client, databaseAndCollection, { name: req.body.name, email: req.body.email });
    
    if (!result.deletedCount) {
        const variables = { port: portNumber, name: `<br><strong>No member removal because ${req.body.name} (email: ${req.body.email}) is not a member</strong>`, 
                                email: "" };
        res.render("endMember", variables);
    } else {
        const variables = { port: portNumber, name: `<br><strong>${req.body.name}'s membership has been canceled.</strong>`, email: ""};
        res.render("endMember", variables);
    }
});

// get request for BMI calculator
app.get('/bmi', (req, res) => {
    res.render("bmi", { port: portNumber, bmi: "", range: "",  health: "" });
});

// post request for BMI calculator (display BMI info for inputted member)
app.post('/bmi', async (req, res) => {
    let result = await dbUtils.getMember(client, databaseAndCollection, { name: req.body.name, email: req.body.email });
    
    if (!result) {
        res.render("bmi", { port: portNumber, bmi: `<br><strong>No data because ${req.body.name} (email: ${req.body.email}) is not a member</strong>`, range: "", health: "" });
    } else {
        const age = result.age, weight= result.weight, height = result.height;
        const url = `https://fitness-calculator.p.rapidapi.com/bmi?age=${age}&weight=${weight}&height=${height}`;
        const options = {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': '337cf0026cmshbac2513797e7306p1a45f5jsn1953e67a140b',
                'X-RapidAPI-Host': 'fitness-calculator.p.rapidapi.com'
            }
        };

        try {
            const response = await fetch(url, options);
            const result = await response.text();
            const rData = (JSON.parse(result)).data;

            res.render("bmi", { port: portNumber, bmi: '<br><strong><span class="confirmHeader">BMI Results</span></strong><br>BMI: ' + rData.bmi + "<br>", range: "Healthy Range: " + rData.healthy_bmi_range + "<br>",  health: "Your Health: " + rData.health });
        } catch (error) {
            console.error(error);
        }
    }
});

// get request for daily calorie calculator
app.get('/dailyCalories', (req, res) => {
    res.render("dailyCalories", { port: portNumber, bmr: "", mw: "", mwl: "", wl: "", ewl: "", mwg: "", wg: "", ewg: "" });
});

// post request for daily calorie calculator (display # calories for certain goals)
app.post('/dailyCalories', async (req, res) => {
    let result = await dbUtils.getMember(client, databaseAndCollection, { name: req.body.name, email: req.body.email });
    
    if (!result) {
        res.render("dailyCalories", { port: portNumber, bmr: `<br><strong>No data because ${req.body.name} (email: ${req.body.email}) is not a member</strong>`, mw: "", mwl: "", wl: "", ewl: "", mwg: "", wg: "", ewg: ""});
    } else {
        const age = result.age, gender = result.gender, weight= result.weight, height = result.height, activitylevel = "level_" + result.activitylevel;

        if (gender !== 'male' && gender !== 'female') {
            res.render("dailyCalories", { port: portNumber, bmr: "<br><strong>Fitness Calculator API does not support this calculation</strong>", mw: "", mwl: "", wl: "", ewl: "", mwg: "", wg: "", ewg: ""});
        }

        const url = `https://fitness-calculator.p.rapidapi.com/dailycalorie?age=${age}&gender=${gender}&height=${height}&weight=${weight}&activitylevel=${activitylevel}`;
        const options = {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': '337cf0026cmshbac2513797e7306p1a45f5jsn1953e67a140b',
                'X-RapidAPI-Host': 'fitness-calculator.p.rapidapi.com'
            }
        };

        try {
            const response = await fetch(url, options);
            const result = await response.text();
            const rData = (JSON.parse(result)).data;
            const variables = { port: portNumber,  bmr: '<br><strong><span class="confirmHeader">Daily Calorie Intake Results</span></strong><br>Basal Metabolic Rate: ' + rData.BMR + "<br><br><em>Number of Calories to Consume Based on Health Goals:</em><br>Maintain weight: ", mw: rData.goals['maintain weight'] + "<br><br>Mild weight loss: ", mwl: rData.goals['Mild weight loss'].calory + "<br>Weight loss: ", wl: rData.goals['Weight loss'].calory + "<br>Extreme weight loss: ", ewl: rData.goals['Extreme weight loss'].calory + "<br><br>Mild weight gain: ", mwg: rData.goals['Mild weight gain'].calory + "<br>Weight gain: ", wg: rData.goals['Weight gain'].calory + "<br>Extreme weight gain: ", ewg: rData.goals['Extreme weight gain'].calory };
            
            res.render("dailyCalories", variables); 
        } catch (error) {
            console.error(error);
        }
    }
});

// get request for ideal weight calculator
app.get('/idealWeight', (req, res) => {
    res.render("idealWeight", { port: portNumber, ham: "", dev: "", mill: "", rob: "" });
});

// post request for ideal weight calculator 
app.post('/idealWeight', async (req, res) => {
    let result = await dbUtils.getMember(client, databaseAndCollection, { name: req.body.name, email: req.body.email });
    
    if (!result) {
        res.render("idealWeight", { port: portNumber, ham: `<br><strong>No data because ${req.body.name} (email: ${req.body.email}) is not a member</strong>`, dev: "", mill: "", rob: ""});
    } else {
        const gender = result.gender, height = result.height;

        if (gender !== 'male' && gender !== 'female') {
            res.render("idealWeight", { port: portNumber, ham: "<br><strong>Fitness Calculator API does not support this calculation</strong>", dev: "", mill: "", rob: ""});
        }

        const url = `https://fitness-calculator.p.rapidapi.com/idealweight?gender=${gender}&height=${height}`;
        const options = {
            method: 'GET',
            headers: {
            'X-RapidAPI-Key': '337cf0026cmshbac2513797e7306p1a45f5jsn1953e67a140b',
            'X-RapidAPI-Host': 'fitness-calculator.p.rapidapi.com'
            }
        };

        try {
            const response = await fetch(url, options);
            const result = await response.text();
            const rData = (JSON.parse(result)).data;
            const variables = { port: portNumber, ham: `<br><strong><span class="confirmHeader">Ideal Weight Results</span></strong><br>Hamwi: ${rData.Hamwi} <em>kg</em>`, dev: `<br>Devine: ${rData.Devine} <em>kg</em>`, mill: `<br>Miller: ${rData.Miller} <em>kg</em>`, rob: `<br>Robinson: ${rData.Robinson} <em>kg</em>`}
            
            res.render("idealWeight", variables); 
        } catch (error) {
            console.error(error);
        }
    }
});

app.listen(portNumber);
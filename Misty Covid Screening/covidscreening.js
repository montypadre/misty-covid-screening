// Misty II Covid Screening
// By Hunter Giannini, Cody Hungerford,
// Michael Reynolds, and Shawn Ramos
// For CIS 497 - Senior Project at the University of South Alabama
// Fall 2020
// For use with the Misty Robotics Misty II, its Arduino Backpack, and the MLX 90614 IR Temp Sensor
// More information available at https://github.com/montypadre/misty-covid-screening



misty.Debug("Moving arms and head to neutral position");
misty.MoveHeadDegrees(0, 0, 0, 40); // Faces head forward
misty.MoveArmDegrees("both", 70, 100); // Lowers arms
misty.ChangeLED(0, 255, 0); // Changes LED to green
misty.DisplayImage("e_DefaultContent.jpg"); // Show default eyes
misty.Set("seenPeople", "[]", false) // List of registered users that have already been screened by Misty
misty.Set("currentPerson", "", false) // Variable to store the current user
misty.Set("tempList", "[]", false) // List used during the temperature taking process to store temperature values to average
misty.Set("tempMode","no", false) // Timeout flag



//API Keys and Sendgrid Template Keys
misty.Set("imgurClientID", "INSERT_IMGUR_API_KEY_HERE", false)
misty.Set("sendGridKey", "INSERT_SENDGRID_API_KEY_HERE", false)
misty.Set("adminAlertTemplate", "INSERT_SENDGRID_TEMPLATE_ID_HERE", false)
misty.Set("adminLogTemplate",   "INSERT_SENDGRID_TEMPLATE_ID_HERE", false)
misty.Set("userReceiptTemplate","INSERT_SENDGRID_TEMPLATE_ID_HERE", false)

// Email Accounts Associated with Misty
misty.Set("userList", 'INSERT_REGISTERED_USERS_HERE')
misty.Set("adminEmail", "INSERT_ADMIN_EMAIL_HERE", false)
misty.Set("sendingEmail", "INSERT_SENDER_EMAIL_HERE", false)

misty.StartFaceRecognition();
registerFaceRec();




// ---------------------------------------- Functions For Face Recognition ---------------------------------------- //

//Registers Face Recognition Event
function registerFaceRec() {
    misty.AddPropertyTest("FaceRec", "Label", "exists", "", "string");
    misty.RegisterEvent("FaceRec", "FaceRecognition", 1000, true);
}

// Function called when a face recognition event occurs
function _FaceRec(data) {
    seenPeople = JSON.parse(misty.Get("seenPeople"))
    var faceDetected = data.PropertyTestResults[0].PropertyValue;
    if (faceDetected != "unknown person" && !seenPeople.includes(faceDetected)){
        seenPeople.push(faceDetected)
        misty.UnregisterEvent("FaceRec")
        misty.Set("seenPeople", JSON.stringify(seenPeople))
        misty.Set("currentPerson", faceDetected)
        misty.Set("tempList", "[]", false)
        misty.Speak(`Hello ${faceDetected}, please come have your temperature taken before proceeding into the area.`, true);
        subscribeToTempData();
        misty.Set('tempMode', "yes", false)
        temperatureTimeout();
    }
    else{
        if (faceDetected != "unknown person") {
            misty.Debug(`${faceDetected} has already been seen and emailed.`)
        }
        else {
            misty.UnregisterEvent("FaceRec")
            misty.Set("currentPerson", faceDetected)
            misty.Speak("Hello Guest, please come have your temperature taken before proceeding into the area", true)
            subscribeToTempData();
        }
    }
}

//Returns Misty to waiting in face recognition mode if a person's temperature isn't taken after 10 seconds
function temperatureTimeout(){
    misty.Pause(10000)
    if (misty.Get("tempMode") == 'yes'){
        misty.Speak("Temperature measurement timed out")
        misty.UnregisterEvent('tempMessage')
        name = misty.Get("currentPerson")
        seenPeople = JSON.parse(misty.Get("seenPeople"))
        newSeenPeople = []
        for (i = 0; i < seenPeople.length; i++) {
            if (seenPeople[i] != name){
                newSeenPeople.push(name)
            }
        }
        misty.Set("seenPeople", JSON.stringify(newSeenPeople), false)
        registerFaceRec()
    }
}

// ---------------------------------------- Functions for Taking Temperature ---------------------------------------- //
// Registers Serial Message event from the Arduino Backpack
function subscribeToTempData() {
    misty.AddReturnProperty("tempMessage", "SerialMessage");
    misty.RegisterEvent("tempMessage", "SerialMessage", 50, true);
}

// Called when Misty receives a message from the Arduino, which represents temperature measurements.
function _tempMessage(data) {
    try {
        if (data !== undefined && data !== null){
            combinedTemp = data.AdditionalResults[0].Message
            tempSplit = combinedTemp.split("|")
            ambTemp = parseFloat(tempSplit[0])
            objTemp = parseFloat(tempSplit[1])
            if (85 < objTemp && objTemp < 150){
                tempList = JSON.parse(misty.Get("tempList"))
                tempList.push(objTemp)
                misty.Set("tempList", JSON.stringify(tempList))
                if (tempList.length == 20){
                    misty.UnregisterEvent("tempMessage");
                    misty.Set("tempMode", "no", false)
                    determineTemp()
                }
            }
        }
    }
    catch (exception) {
        misty.Debug("Exception" + exception)
    }
}

// Determines whether or not the user's temperature is in a safe range, and has Misty respons and send emails accordingly
function determineTemp(){
    misty.Speak("Finished Taking Temperature")
    tempList = JSON.parse(misty.Get("tempList"))
    sum = tempList.reduce(function(a, b){
        return a + b;
    }, 0);
    average = sum/tempList.length
    if (average < 95 ){
        misty.Speak("Your temperature is in a safe range. You are good to go. Have a Nice Day!")
        response = "a safe"
        misty.Set("status", "Safe", false)
    }
    else {
        misty.Speak("Youre temperature is in an unsafe range. Please leave the area and consider getting tested.")
        reponse = "an unsafe"
        misty.Set("status", "Unsafe", false)
        misty.TakePicture("myPic", 1920, 1080, false, true, "_alertAdmin");
        
    }
    if (misty.Get("currentPerson") != "unknown person"){
        emailKnownUser(response)
    }
    else (
        misty.TakePicture("myPic", 1920, 1080, false, true, "_logAdmin")
    )
}

function _alertAdmin(data){
    base64String = data.Result.Base64
    uploadImage(base64String, "_emailAdminAlert")
}

function _logAdmin(data){
    base64String = data.Result.Base64
    uploadImage(base64String, "_emailAdminLog")
}


// ---------------------------------------- Functions for Taking and Uploading images ---------------------------------------- //

function uploadImage(imageData, responseFunction) {
    jsonBody = {
        "image": imageData,
        "type": "base64"
    };
    clientID = misty.Get("imgurClientID")
    misty.SendExternalRequest(
        "POST",
        "https://api.imgur.com/3/upload",
        "Client-ID",
        clientID,
        JSON.stringify(jsonBody),
        false,
        false,
        "",
        "application/json",
        responseFunction
    )
}

// ---------------------------------------- Functions for Emailing Users and Admins ---------------------------------------- //

function emailKnownUser(response){
    emailList = JSON.parse(misty.Get("userList"))
    d = new Date();
    currentDate = `${d.getMonth()}/${d.getDate()}/${d.getFullYear()}`
    name = misty.Get("currentPerson")
    template = misty.Get("userReceiptTemplate")
    email = emailList[name]
    payloadObject = {
        "from": {
            "email": misty.Get("sendingEmail"),
            "name": "Misty Security",
            "reply_to": {
                "email": misty.Get("adminEmail"),
                "name": "Team Insert Name Here"
            }
        },
        "template_id": template,
        "personalizations": [
            {
                "to": [{
                    "email": email,
                    "name": name
                }],
                "dynamic_template_data":{
                    "name": name,
                    "date": currentDate,
                    "response": response
                }
            }
        ]
    }
    sendgridApiKey = misty.Get("sendGridKey")
    sendgridUrl = "https://api.sendgrid.com/v3/mail/send"
    misty.SendExternalRequest(
        "POST",
        sendgridUrl,
        "Bearer",
        sendgridApiKey,
        JSON.stringify(payloadObject),
        false,
        false,
        "",
        "application/json",
        "_emailUploadResponse");
}

function _emailAdminAlert(data){
    link = JSON.parse(data.Result.ResponseObject.Data).data.link
    d = new Date();
    currentDate = `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`
    name = misty.Get("currentPerson")
    template = misty.Get("adminAlertTemplate")
    payloadObject = {
        "from": {
            "email": misty.Get("sendingEmail"),
            "name": "Misty Security",
            "reply_to": {
                "email": misty.Get("adminEmail"),
                "name": "Team Insert Name Here"
            }
        },
        "template_id": template,
        "personalizations": [
            {
                "to": [{
                    "email": misty.Get("adminEmail"),
                    "name": "Misty Covid Screening Admin"
                }],
                "dynamic_template_data":{
                    "name": name,
                    "date": currentDate,
                    "link": link
                }
            }
        ]
    }
    sendgridApiKey = misty.Get("sendGridKey")
    sendgridUrl = "https://api.sendgrid.com/v3/mail/send"
    misty.SendExternalRequest(
        "POST",
        sendgridUrl,
        "Bearer",
        sendgridApiKey,
        JSON.stringify(payloadObject),
        false,
        false,
        "",
        "application/json",
        "_emailUploadResponse");

}

function _emailAdminLog(data){
    link = JSON.parse(data.Result.ResponseObject.Data).data.link
    d = new Date();
    currentDate = `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`
    template = misty.Get("adminLogTemplate")
    status = misty.Get("status")
    payloadObject = {
        "from": {
            "email": misty.Get("sendingEmail"),
            "name": "Misty Security",
            "reply_to": {
                "email": misty.Get("adminEmail"),
                "name": "Team Insert Name Here"
            }
        },
        "template_id": template,
        "personalizations": [
            {
                "to": [{
                    "email": misty.Get("adminEmail"),
                    "name": "Misty Covid Screening Admin"
                }],
                "dynamic_template_data":{
                    "date": currentDate,
                    "link": link,
                    "status": status
                }
            }
        ]
    }
    sendgridApiKey = misty.Get("sendGridKey")
    sendgridUrl = "https://api.sendgrid.com/v3/mail/send"
    misty.SendExternalRequest(
        "POST",
        sendgridUrl,
        "Bearer",
        sendgridApiKey,
        JSON.stringify(payloadObject),
        false,
        false,
        "",
        "application/json",
        "_emailUploadResponse");
}


function _emailUploadResponse(data) {
    misty.Pause(10000)
    registerFaceRec()
}

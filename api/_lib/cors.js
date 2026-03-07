/**
 * Sets CORS headers and handles OPTIONS preflight requests.
 * Call at the top of every serverless handler.
 * Returns true if the request was a preflight (caller should return immediately).
 */
function setCors(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Authorization, Content-Type, Accept'
    );
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return true; // preflight handled — caller must return
    }
    return false;
}

module.exports = setCors;

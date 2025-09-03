// Middleware to log all requests to the console
const requestLogger = (req, res, next) => {
    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' }); // WAT timezone
    const { method, originalUrl, headers, body, ip } = req;
  
    // Prepare log entry
    const logEntry = {
      timestamp,
      method,
      url: originalUrl,
      ip: ip || req.connection.remoteAddress,
      userAgent: headers['user-agent'] || 'unknown',
      origin: headers['origin'] || 'none',
      body: method === 'POST' || method === 'PUT' || method === 'PATCH' ? body : undefined,
    };
  
    // Log to console
    console.log('Request:', JSON.stringify(logEntry, null, 2));
  
    // Continue to the next middleware
    next();
  };
  
  export default requestLogger;
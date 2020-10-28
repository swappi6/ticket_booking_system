const adminPassword = "TEST_ADMIN"

const ticketStates = {
    OPEN: "OPEN",
    CLOSED: "CLOSED"
};

const dbConfig = {
    user: "postgres",
    password: "admin",
    database: "ticket_booking",
    host: "localhost",
    port: 5432
}

module.exports = {
    dbConfig,
    adminPassword,
    ticketStates
};
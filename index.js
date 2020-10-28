const express = require("express");
const app = express();
const db = require("./database");
const { json } = require("express");
const config = require("./config");
const { adminPassword, ticketStates } = require("./config");

app.use(express.json())


//ROUTES//

// Get all open tickets
app.get("/api/v1/getOpenTickets", async(request, response) => {
        try {
            //await
            const openTicketsQuery = await db.getOpenTickets();

            if (!openTicketsQuery.rows.length) {
                response.json("All Tickets are CLOSED");
            } else {
                response.json(openTicketsQuery.rows);
            }
        } catch(err) {
            logErrorAndSendResponse(request, response, err);
        }
});

// Get all closed tickets
app.get("/api/v1/getClosedTickets", async(request, response) => {
        try {
            //await
            const closedTicketsQuery = await db.getClosedTickets();

            if (!closedTicketsQuery.rows.length) {
                response.json("All Tickets are OPEN");
            } else {
                response.json(closedTicketsQuery.rows);
            }
        } catch(err) {
            logErrorAndSendResponse(request, response, err);
        }
});

// Get ticket state by Id
app.get("/api/v1/getTicketStateById/:id", async(request, response) => {
        const { id } = request.params

        try {
            //await
            const ticketQuery = await db.getTicketById(id);
              if (!ticketQuery.rows.length) {
                response.status(400).json(`Ticket Id ${id} doesn't exist`);
              } else {
                response.json(ticketQuery.rows[0].state);
              }
        } catch(err) {
            logErrorAndSendResponse(request, response, err);
        }
});

// Get user details from ticket
app.get("/api/v1/getUserDetailsByTicketId/:id", async(request, response) => {
        const { id } = request.params

        try {
            const ticketDetailsQuery = await db.getTicketById(id);
            if (!ticketDetailsQuery.rows.length) {
                response.status(400).json(`Ticket ID ${id} doesn't exist`);
            } else if (ticketDetailsQuery.rows[0].state == ticketStates.OPEN) {
                response.status(400).json(`Ticket ID ${id} is still OPEN`);
            } else {
                const userId = ticketDetailsQuery.rows[0].user_id;
                if (userId) {
                    const user = await db.getUserById(userId);
                    if (!user.rows.length) {
                        throw new Error(`User Id ${userId} present for ticket ID : ${id}, is not a valid ID`);
                    } else {
                        response.json(user.rows[0]);
                    }
                } else throw new Error(`User Id not present for ticket ID : ${id}`);
            }
        } catch(err) {
            logErrorAndSendResponse(request, response, err);
        }
});


app.post("/api/v1/updateTicketStatus", async(request, response) => {
    try {
        const body = request.body;
        if (body.ticketId && body.state) {
            const updatedStatusQuery = await db.addUserDetailsAndUpdateTicketStatus(body.ticketId, body.state, body.userDetails);
            if (updatedStatusQuery.rows.length == 1) {
                response.json(`Successfully set the ticket state as ${body.state}`);
            } else {
                if (updatedStatusQuery.error) {
                    response.status(400).json(updatedStatusQuery.error);
                } else if (updatedStatusQuery.rows && !updatedStatusQuery.rows.length) {
                    response.status(400).json(`Either the Ticket State is already set to ${body.state} or the ticket Id is not valid`);
                } else {
                    response.status(500).json("Something went wrong");
                }
            }
        } else {
            response.status(400).json(`Invalid JSON : ${json}`);
        }
    } catch(err) {
        logErrorAndSendResponse(request, response, err);
    }
});

app.put("/admin/api/v1/resetServer", async(request, response) => {
    try {
        const body = request.body;
        if (body.adminPassword && body.adminPassword == adminPassword) {
            const openAllTicketsQuery = await db.openAllTickets();
            if (!openAllTicketsQuery.rows.length) {
                response.status(400).json("There are no tickets to update");
            } else {
                response.json(openAllTicketsQuery.rows);
            }
        } else if (body.adminPassword) {
            response.status(400).json(` Invalid Admin Password ${body.adminPassword},
            ADMIN PASSWORD is required to reset Server`);
        } else {
            response.status(400).json("ADMIN PASSWORD is required to reset Server ");
        }
    } catch(err) {
        logErrorAndSendResponse(request, response, err);
    }
});





app.listen(5000,() => {
    console.log("server is listening on port 5000");
});

const logErrorAndSendResponse = (request, response, error) => {
    console.error(`Error for ${request.originalUrl}: ${error.message}`);
    response.status(500).json(error.message);
};


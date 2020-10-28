const Pool = require("pg").Pool;
const config = require("./config");
const { ticketStates, dbConfig } = require("./config");

const pool = new Pool(dbConfig);

const runTransaction = async callback => {
    const client = await pool.connect()
    try {
    await client.query('BEGIN');
      try {
        const result = await callback(client);
        client.query('COMMIT');
        return result;
      } catch(e) {
        client.query('ROLLBACK');
        console.log("Error  : " + e);
        throw e;
      }
    } finally {
      client.release()
    }
  }

const getOpenTickets = () => {
    return pool.query(`Select * from tickets where state = '${ticketStates.OPEN}'`);
};

const getClosedTickets = () => {
    return pool.query(`Select * from tickets where state = '${ticketStates.CLOSED}'`);
};

const getTicketById = (id) => {
    return pool.query("Select * from tickets where ticket_id = $1", [id]);
};

const getUserById = (id) => {
    return pool.query("Select * from users where user_id = $1", [id]);
};

const addNewUser = (client, name, email, mobile) => {
    return client.query("INSERT INTO users(name,email,phone,created_on) VALUES ($1,$2,$3,NOW()) Returning user_id", [name, email, mobile]);
};

const addUserDetailsAndUpdateTicketStatus = (id, state, userDetails) => {
    switch(state) {
        case ticketStates.OPEN:
            if (userDetails) {
                const errorObj = new Object();
                errorObj.error = `User Details must NOT be provided for closing any ticket, ticketID ${id}`;
                return errorObj;
            } else {
                return pool.query(`UPDATE tickets SET state = '${ticketStates.OPEN}', user_id = null, 
                last_updated_on = NOW() WHERE ticket_id = $1 and
                state = '${ticketStates.CLOSED}' RETURNING *`, [id]);
            }
        case ticketStates.CLOSED: 
            if (userDetails && userDetails.name && userDetails.email && userDetails.mobile) {
                return runTransaction(async client => {
                    const usersQuery = await addNewUser(client, userDetails.name, userDetails.email, userDetails.mobile);
                    const userId = usersQuery.rows[0].user_id;
                    const updateQuery = await client.query(`UPDATE tickets SET state = '${ticketStates.CLOSED}', 
                    user_id = ${userId}, last_updated_on = NOW() 
                    WHERE ticket_id = $1 and state = '${ticketStates.OPEN}' RETURNING *`, [id]);
                    if (!updateQuery.rows.length) {
                        client.query("ROLLBACK");
                    }
                    return updateQuery;
                });
            } else {
                const errorObj = new Object();
                errorObj.error = `User Details must be provided for closing any ticket, ticketID ${id}`;
                return errorObj;
            }
        default:
            const errorObj = new Object();
            errorObj.error = `Ticket Status ${state} is not a valid status`;
            return errorObj;    
    }
};

const openAllTickets = () => {
    return pool.query(`UPDATE tickets SET state = '${ticketStates.OPEN}',user_id=null, last_updated_on = NOW() 
    RETURNING ticket_id`);
};

module.exports = {
    getOpenTickets,
    getClosedTickets,
    getTicketById,
    getUserById,
    openAllTickets,
    addUserDetailsAndUpdateTicketStatus
};
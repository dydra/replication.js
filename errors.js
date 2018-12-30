// Copyright (c) 2019 datagraph gmbh

const messages = {
    DataError: "Data provided to an operation does not meet requirements.",
    InvalidAccessError:
        "An invalid operation was performed on an object. For example transaction creation attempt was made, but an empty scope was provided.",
    InvalidStateError:
        "An operation was called on an object on which it is not allowed or at a time when it is not allowed. Also occurs if a request is made on a source object that has been deleted or removed. Use TransactionInactiveError or ReadOnlyError when possible, as they are more specific variations of InvalidStateError.",
    NotFoundError:
        "The operation failed because the requested database object could not be found. For example, an object store did not exist but was being opened.",
    ReadOnlyError:
        'The mutating operation was attempted in a "readonly" transaction.',
    TransactionInactiveError:
        "A request was placed against a transaction which is currently not active, or which is finished.",
};

class GraphDatabaseError extends Error {
  constructor (message = null) {
    super(message);
    this.name = this.constructor.name;
    if (!message) {
      this.message = messages[this.name];
    }
  }
}

export class DataError extends GraphDatabaseError {
}

export class InvalidAccessError extends GraphDatabaseError {
}

export class InvalidStateError extends GraphDatabaseError {
}

export class NotFoundError extends GraphDatabaseError {
}

export class ReadOnlyError extends GraphDatabaseError {
}

export class TransactionInactiveError extends GraphDatabaseError {
}

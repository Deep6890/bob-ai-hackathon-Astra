import logging
import sys

def setup_structured_logger():
    logger = logging.getLogger("bob_astra")
    if logger.handlers:
        return logger
        
    logger.setLevel(logging.INFO)
    
    # Create console handler
    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(logging.INFO)
    
    # Create formatter
    formatter = logging.Formatter('%(message)s')
    ch.setFormatter(formatter)
    
    logger.addHandler(ch)
    return logger

def get_logger():
    return logging.getLogger("bob_astra")

def log(tag, message, level="info"):
    logger = get_logger()
    formatted_msg = f"[{tag}] {message}"
    if level == "info":
        logger.info(formatted_msg)
    elif level == "error":
        logger.error(formatted_msg)
    elif level == "warning":
        logger.warning(formatted_msg)

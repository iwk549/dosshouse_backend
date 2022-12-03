from pymongo import MongoClient
import csv

def connect_to_db(live):
    db_url = "mongodb://localhost:27017/?readPreference=primary&appname=MongoDB%20Compass&directConnection=true&ssl=false"
    db_name = "dosshouse"
    if live:
        with open("db_connection_do_not_commit") as file:
            db_url = file.read()
            db_name = "dosshouse"

    client = MongoClient(db_url)
    db = client[db_name]
    
    return db


def output_to_csv(filename, data, headers = [], print_function = None):
    with open(filename, 'w', newline='', encoding='UTF8') as csvfile:
        writer = csv.writer(csvfile)
        
        writer.writerow(headers)

        for row in data:
            print('here', row)
            flattened = []
            for header in headers:
                flattened.append(row[header])
            writer.writerow(flattened)
            if print_function:
                print_function(row)
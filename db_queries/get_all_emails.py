from utils import connect_to_db, output_to_csv


db = connect_to_db(True)
distinct_emails = db.users.find()


def print_output(row):
    print(row)

output_to_csv('distinct_emails.csv', distinct_emails, ['email'], print_function=print_output)
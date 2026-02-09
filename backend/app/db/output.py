import lancedb

db = lancedb.connect("./memory_db")

print(db.list_tables())

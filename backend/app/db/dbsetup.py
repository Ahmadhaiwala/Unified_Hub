import lancedb
import pyarrow as pa
from sentence_transformers import SentenceTransformer

db = lancedb.connect("./memory_db")
model = SentenceTransformer("all-MiniLM-L6-v2")

schema = pa.schema([
    ("id", pa.string()),
    ("text", pa.string()),
    ("vector", pa.list_(pa.float32(), 384)),
    ("timestamp", pa.string()),
    ("metadata", pa.string())
])

# Updated API call
if "memory" not in db.list_tables():
    db.create_table("memory", schema=schema)

table = db.open_table("memory")

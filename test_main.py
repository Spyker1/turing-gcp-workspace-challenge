import unittest
from main import extract_metadata, process_gcs_file


class MockCloudEvent:
  """Simula un objeto CloudEvent de Google Cloud Functions Gen 2."""

  def __init__(self, data):
    self.data = data


class TestCloudStorageMetadataFunction(unittest.TestCase):

  def setUp(self):
    self.valid_payload = {
        "bucket": "turing-candidate-storage-prod",
        "name": "datasets/q3_raw_sales.csv",
        "size": "2048000",
        "contentType": "text/csv",
        "storageClass": "STANDARD",
        "timeCreated": "2026-09-28T16:00:00.000Z",
        "updated": "2026-09-28T16:00:00.000Z",
        "metageneration": "1",
        "md5Hash": "d41d8cd98f00b204e9800998ecf8427e",
    }

  def test_extract_metadata_success(self):
    res = extract_metadata(self.valid_payload)
    self.assertEqual(res["bucket"], "turing-candidate-storage-prod")
    self.assertEqual(res["name"], "datasets/q3_raw_sales.csv")
    self.assertEqual(res["size_bytes"], 2048000)
    self.assertEqual(res["size_mb"], 1.9531)

  def test_extract_metadata_missing_bucket(self):
    with self.assertRaises(ValueError):
      extract_metadata({"name": "data.csv", "size": 100})

  def test_extract_metadata_missing_name(self):
    with self.assertRaises(ValueError):
      extract_metadata({"bucket": "my-bucket", "size": 100})

  def test_extract_metadata_defaults(self):
    minimal = {"bucket": "my-bucket", "name": "docs/manual.pdf"}
    res = extract_metadata(minimal)
    self.assertEqual(res["size_bytes"], 0)
    self.assertEqual(res["content_type"], "application/octet-stream")

  def test_process_gcs_file_cloudevent(self):
    event = MockCloudEvent(self.valid_payload)
    res = process_gcs_file(event)
    self.assertEqual(res["status"], "success")

  def test_process_gcs_file_validation_error(self):
    invalid_event = {"bucket": "only-bucket-without-name"}
    res = process_gcs_file(invalid_event)
    self.assertEqual(res["status"], "validation_error")

  def test_process_gcs_file_unsupported_type(self):
    res = process_gcs_file("string_invalido_no_evento")
    self.assertEqual(res["status"], "error")


if __name__ == "__main__":
  unittest.main()
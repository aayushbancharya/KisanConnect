"""Focused integration checks for the account-owned farm workspace API."""
import os
import tempfile
import unittest

_db_path = os.path.join(tempfile.gettempdir(), f"smartcrop-tests-{os.getpid()}.sqlite")
os.environ["DATABASE_URL"] = f"sqlite:///{_db_path}"

from app import app, db  # noqa: E402


class FarmWorkspaceApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.config.update(TESTING=True)
        cls.client = app.test_client()

    def setUp(self):
        result = self.client.post("/api/register", json={
            "name": "Test Farmer", "email": f"farmer-{id(self)}@example.test", "password": "secure-test-password",
        })
        self.assertEqual(result.status_code, 201)
        self.token = result.get_json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_farmer_can_save_farm_and_read_it_back(self):
        created = self.client.post("/api/farms", headers=self.headers, json={
            "name": "North field", "state": "Karnataka", "district": "Mysuru", "acres": 2.5, "soilType": "Red",
        })
        self.assertEqual(created.status_code, 201)
        farm = created.get_json()["farm"]
        self.assertEqual(farm["acres"], 2.5)
        self.assertEqual(self.client.get("/api/farms", headers=self.headers).get_json()["farms"][0]["id"], farm["id"])

    def test_farmer_tool_advisory_is_persisted(self):
        farm_response = self.client.post("/api/farms", headers=self.headers, json={
            "name": "East field", "state": "Karnataka", "district": "Mysuru", "acres": 1,
        })
        farm_id = farm_response.get_json()["farm"]["id"]
        response = self.client.post("/api/farm-tools/irrigation", headers=self.headers, json={
            "farmId": farm_id, "forecastRainMm": 18, "temperatureC": 28,
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["status"], "rule_based_advisory")
        history = self.client.get(f"/api/farm-records?farmId={farm_id}", headers=self.headers).get_json()["records"]
        self.assertEqual(history[0]["kind"], "irrigation")

    def test_crop_selection_updates_owned_farm_and_is_persisted(self):
        created = self.client.post("/api/farms", headers=self.headers, json={
            "name": "Selection test", "state": "Karnataka", "district": "Mysuru", "acres": 1,
        })
        farm_id = created.get_json()["farm"]["id"]
        response = self.client.post(f"/api/farms/{farm_id}/crop-selection", headers=self.headers, json={"crop": "Tomato"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["farm"]["currentCrop"], "Tomato")
        self.assertEqual(self.client.get(f"/api/farm-records?farmId={farm_id}", headers=self.headers).get_json()["records"][0]["kind"], "crop-selection")

    def test_irrigation_requires_explicit_weather_inputs(self):
        response = self.client.post("/api/farm-tools/irrigation", headers=self.headers, json={"crop": "Rice"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("No sensor or weather data", response.get_json()["error"])

    def test_crop_advice_and_input_guidance_are_saved_without_claiming_ml(self):
        farm = self.client.post("/api/farms", headers=self.headers, json={
            "name": "Advisor test", "state": "Karnataka", "district": "Mysuru", "acres": 1, "soilType": "Red soil",
        }).get_json()["farm"]
        crop = self.client.post("/api/farm-tools/crop-advice", headers=self.headers, json={
            "farmId": farm["id"], "season": "Kharif", "waterAvailability": "medium",
        })
        self.assertEqual(crop.status_code, 200)
        self.assertEqual(crop.get_json()["status"], "rule_based_advisory")
        nutrient = self.client.post("/api/farm-tools/nutrient-advice", headers=self.headers, json={
            "farmId": farm["id"], "crop": "Tomato", "observation": "yellowing leaves",
        })
        self.assertEqual(nutrient.status_code, 200)
        self.assertEqual(nutrient.get_json()["status"], "general_guidance")
        self.assertIn("No fertilizer or pesticide dosage", nutrient.get_json()["label"])

    def test_yield_tool_persists_unavailable_model_status_without_estimate(self):
        response = self.client.post("/api/farm-tools/yield-estimate", headers=self.headers, json={"crop": "Rice", "acres": 2})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["status"], "model_unavailable")
        self.assertNotIn("yield", response.get_json())

    def test_farm_data_requires_authentication(self):
        self.assertEqual(self.client.get("/api/farms").status_code, 401)

    def test_disease_tool_does_not_claim_unavailable_inference(self):
        response = self.client.post("/api/farm-tools/disease-analysis", headers=self.headers, json={"crop": "Tomato"})
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.get_json()["status"], "provider_unconfigured")

    def test_invalid_weather_values_are_rejected(self):
        response = self.client.post("/api/farm-tools/irrigation", headers=self.headers, json={"forecastRainMm": "rain"})
        self.assertEqual(response.status_code, 400)

    def test_marketplace_listing_is_owned_by_creator(self):
        listing = {"farmerName": "Test Farmer", "crop": "Tomato", "quantity": 10, "price": 1200,
                   "unit": "Quintal", "state": "Karnataka", "district": "Mysuru", "phone": "9999999999"}
        created = self.client.post("/api/listings", headers=self.headers, json=listing)
        self.assertEqual(created.status_code, 201)
        listing_id = created.get_json()["listing"]["id"]
        public = self.client.get("/api/listings").get_json()["listings"]
        public_listing = next(item for item in public if item["id"] == listing_id)
        self.assertIsNone(public_listing["phone"])
        mine = self.client.get("/api/listings?mine=true", headers=self.headers).get_json()["listings"]
        self.assertTrue(any(item["id"] == listing_id for item in mine))
        self.assertEqual(next(item for item in mine if item["id"] == listing_id)["phone"], listing["phone"])

        second = app.test_client()
        other = second.post("/api/register", json={"name": "Other Farmer", "email": f"other-{id(self)}@example.test", "password": "another-secure-password"}).get_json()["token"]
        denied = second.delete(f"/api/listings/{listing_id}", headers={"Authorization": f"Bearer {other}"})
        self.assertEqual(denied.status_code, 403)
        self.assertEqual(self.client.delete(f"/api/listings/{listing_id}", headers=self.headers).status_code, 200)

    def test_marketplace_rejects_invalid_quantities_and_prices(self):
        response = self.client.post("/api/listings", headers=self.headers, json={
            "farmerName": "Test Farmer", "crop": "Tomato", "quantity": 0, "price": -10,
            "unit": "Quintal", "state": "Karnataka", "phone": "9999999999",
        })
        self.assertEqual(response.status_code, 400)

    def test_marketplace_buyer_inquiry_and_farmer_reply(self):
        created = self.client.post("/api/listings", headers=self.headers, json={
            "farmerName": "Test Farmer", "crop": "Onion", "quantity": 10, "price": 1200,
            "unit": "Quintal", "state": "Karnataka", "phone": "9999999999",
        })
        listing_id = created.get_json()["listing"]["id"]
        buyer = app.test_client()
        token = buyer.post("/api/register", json={"name": "Buyer", "email": f"buyer-{id(self)}@example.test", "password": "secure-test-password"}).get_json()["token"]
        buyer_headers = {"Authorization": f"Bearer {token}"}
        inquiry = buyer.post(f"/api/listings/{listing_id}/inquiries", headers=buyer_headers, json={"message": "Is the onion available this week?"})
        self.assertEqual(inquiry.status_code, 201)
        inquiry_id = inquiry.get_json()["inquiry"]["id"]
        self.assertEqual(self.client.get("/api/inquiries/received", headers=self.headers).get_json()["inquiries"][0]["id"], inquiry_id)
        self.assertEqual(self.client.post(f"/api/inquiries/{inquiry_id}/reply", headers=self.headers, json={"reply": "Yes, available."}).status_code, 200)
        self.assertEqual(self.client.get("/api/inquiries/received", headers=self.headers).get_json()["inquiries"][0]["farmerReply"], "Yes, available.")
        self.assertEqual(buyer.get("/api/inquiries/sent", headers=buyer_headers).get_json()["inquiries"][0]["farmerReply"], "Yes, available.")
        self.assertEqual(buyer.post(f"/api/inquiries/{inquiry_id}/reply", headers=buyer_headers, json={"reply": "fake reply"}).status_code, 404)

    def test_scheme_directory_points_to_official_portals(self):
        response = self.client.get("/api/schemes")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(all(item["url"].startswith("https://") for item in response.get_json()["schemes"]))


if __name__ == "__main__":
    unittest.main()

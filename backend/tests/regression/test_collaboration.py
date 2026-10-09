"""Room collaboration and admission authorization regressions."""

from tests.regression.test_meetings import ORIGIN, create, join


def receive(socket, kind):
    for _ in range(20):
        event = socket.receive_json()
        if event["type"] == kind:
            return event
    raise AssertionError(f"Expected {kind}")


def test_waiting_admission_and_guest_cannot_change_policy(client):
    meeting = create(client)
    code = meeting["code"]
    host = join(client, code, "Host", meeting["host_token"])
    guest = join(client, code, "Guest")
    with client.websocket_connect(f"/ws/meetings/{code}", headers=ORIGIN) as h:
        h.send_json({"token": host["token"]})
        receive(h, "welcome")
        h.send_json({"type": "policy", "patch": {"waiting_room": True}})
        assert receive(h, "policy")["policy"]["waiting_room"]
        with client.websocket_connect(f"/ws/meetings/{code}", headers=ORIGIN) as g:
            g.send_json({"token": guest["token"]})
            assert receive(g, "waiting")["policy"]["waiting_room"]
            assert (
                receive(h, "waiting_list")["peers"][0]["id"] == guest["participant_id"]
            )
            h.send_json({"type": "admit", "target": guest["participant_id"]})
            assert receive(g, "welcome")["peers"][0]["role"] == "host"
            g.send_json({"type": "policy", "patch": {"waiting_room": False}})
            assert "Only the host" in receive(g, "error")["message"]
            g.send_json({"type": "chat", "text": "Hello host"})
            assert receive(h, "chat")["entry"]["display_name"] == "Guest"
            assert receive(g, "chat")["entry"]["text"] == "Hello host"
            g.send_json({"type": "reaction", "emoji": "👍"})
            assert receive(h, "reaction")["id"] == guest["participant_id"]
            receive(g, "reaction")
            h.send_json({"type": "policy", "patch": {"chat": False}})
            receive(h, "policy")
            receive(g, "policy")
            g.send_json({"type": "chat", "text": "Blocked message"})
            assert "disabled participant chat" in receive(g, "error")["message"]
            g.close()
        h.close()

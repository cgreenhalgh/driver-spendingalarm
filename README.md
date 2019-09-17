# Spending Alarm Driver

Chris Greenhalgh, The University of Nottingham, 2019

A databox driver to support the databox 
[Spending Alarm app](https://github.com/cgreenhalgh/app-spendingalarm),
in particular to push reports
to a remote monitoring service (provisionally based on 
[RADAR-BASE](https://radar-base.org/).

Status: just split out driver because apps can't access external servers

- initially written in node, but node drivers are BIG, so rewrite in go
- doesn't actually write any data

## Design option notes

The driver whitelists the destination server so it can post to it.

### Alternative A - use export service instead

The app whitelists for export the external service, and uses the
export service to post reports directly.

So the app can monitor if reports have been received correctly
by polling the export service.

But only basic POST of JSON content to tha destination URL are possible.

### Alternative B - request queue only

The driver exposes a datasource (actuator) that the app sends
reports to. The driver forwards these to the destination service.
Presumably the driver checks success and retries failed requests.
Does the driver honour the order of requests in the face of failure?
Maybe depends on the failure mode, e.g. bad request => permanent
failure.

So any app given access to that datasource can view all reports.
And any driver claiming to implement the same datasource can 
(accidentally or deliberately) be linked to the app instead of the
intended remote host/service.

So the app has no access to report status information.
And the driver has no access to app status information other
that successfully written reports.
And the driver has no access to bank transaction reports or status.

### Alternative C - request queue plus observable driver state (KV)

As with 'request queue only', but the driver also exposes some of
its internal state as a (KV) datasource.

So the (any) app given access to the status datasource can give 
the user feedback about sent reports, etc.

That would definitely make the app the main UI.

### Alternative D? - zest notifications

John added 
[notifications](https://github.com/me-box/zestdb/tree/reason3/docs#notification)
to zestdb/store in response to the discussion about 
[RPC support](https://github.com/me-box/databox/issues/273) 
[2](https://github.com/me-box/databox/issues/10) and 
the [suggested interface](https://github.com/cgreenhalgh/store-jobqueue).

Notifications seems to just rely on observe - no persistence?
John's comment mentions handling (only?!) the 'sub' aspects so maybe so.

Note, security scoping per client for RPC is rather like splitting a 
datasource into per-client fragments, perhaps even in the ID (DSID:CID). 

### Alternative E - request queue plus observable request state (KV)

Like C, but feedback is more fine-grained, i.e. per request (request ID
is part of KV key). So closer to the 
[suggested RPC interface](https://github.com/cgreenhalgh/store-jobqueue).

Perhaps combined with the overall (or per-client) driver status from C?

## RADAR notes

To send to the RADAR gateway itself the request requires 
authentication and IDs (subject, project, device).
These are typically obtained from scanning a QRCode generated
by the RADAR management console. 

(How, you might ask, do we do that from a datbox app? 
it could be supported by the app in future, or maybe even now
with using the OAuth support and changing the QRCode.)

Should this stuff be in the driver, i.e. the driver is configured
to send reports perhaps from various apps? 
or should it be in the app and the driver is essentially generic?
If the latter then the credentials etc will be exposed in the 
request data!

Does RADAR base also require the use of AVRO encoded values to
the gateway? That will mean getting the right (installation-
specific) type ID(s) aswell for the submitted data.

## Configuration notes

What might be configurable?

- authentication and other common request options (if driver is
specifically associated with the service - see RADAR notes, above).

- retry interval(s) and policies.

- watchdog policies and intervals, if any. E.g. to report an
apparent failure of the app.??

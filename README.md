# Data

## Prerequisites

- [Node.js](https://nodejs.org/en/)

  v15.6.0 on macOS Big Sur is confirmed to work.

## Getting Started

1. `git clone git@github.com:symptomizer/data.git`
1. `cd git`
1. `npm i`
1. `npm start`

## Environment Variables

| Name                                 | Notes                                                                                                                            |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `NHS_API_KEY`                        | The key for accessing the NHS API. Available from [the NHS developer portal](https://developer.api.nhs.uk/profile).              |
| `MEDICINESCOMPLETE_PLAY_SESSION_JWT` | The `PLAY_SESSION` cookie from an authenticated session with the MedicinesComplete website. It should be a JSON Web Token (JWT). |

## Services

This app functions as a proxy for the following services, automatically caching data and injecting authentication.

### NHS

A request to `/nhs/<PATH>` is proxied to `https://api.nhs.uk/<PATH>`.

### MedicinesComplete

A request to `/medicinesComplete/<PATH>` is proxied to `https://www.medicinescomplete.com/api/<PATH>`.

### WHO IRIS

A request to `/who/<DOCID>` returns the PDF document from `https://apps.who.int/iris/handle/<DOCID>`.

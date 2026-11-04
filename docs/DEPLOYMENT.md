# Deployment

## One-time GCP setup (Cory — see NEEDS-CORY.md)

1. **Create three GCP projects**:
   - `buildercfo-ai-prod` (production)
   - `buildercfo-ai-staging` (staging)
   - `buildercfo-ai-dev` (developer playground)

2. **Enable APIs in each project**:
   ```bash
   gcloud services enable \
     run.googleapis.com \
     cloudbuild.googleapis.com \
     firestore.googleapis.com \
     firebase.googleapis.com \
     identitytoolkit.googleapis.com \
     storage.googleapis.com \
     cloudtasks.googleapis.com \
     cloudscheduler.googleapis.com \
     secretmanager.googleapis.com \
     cloudkms.googleapis.com \
     logging.googleapis.com \
     monitoring.googleapis.com \
     artifactregistry.googleapis.com \
     iam.googleapis.com \
     --project=buildercfo-ai-prod
   ```

3. **Link Firebase**:
   - Firebase Console → Add project → select the GCP project.
   - Firestore → Create database → **Native mode** → `us-central1`.
   - Authentication → Enable: Email/Password, Google, Email link.
   - Storage → Get started → use the default bucket.

4. **Create Artifact Registry**:
   ```bash
   gcloud artifacts repositories create buildercfo \
     --repository-format=docker \
     --location=us-central1 \
     --project=buildercfo-ai-prod
   ```

5. **Create Cloud KMS key**:
   ```bash
   gcloud kms keyrings create buildercfo \
     --location=us-central1 \
     --project=buildercfo-ai-prod

   gcloud kms keys create token-encryption-key \
     --keyring=buildercfo \
     --location=us-central1 \
     --purpose=encryption \
     --project=buildercfo-ai-prod
   ```

6. **Create service accounts**:
   ```bash
   for SA in buildercfo-web buildercfo-worker buildercfo-cicd; do
     gcloud iam service-accounts create $SA \
       --display-name="$SA" \
       --project=buildercfo-ai-prod
   done
   ```

7. **Grant IAM roles** (least privilege):
   ```bash
   PROJECT=buildercfo-ai-prod

   # Web service account: Firestore, Cloud Tasks, Storage, KMS, Secret Manager
   for ROLE in datastore.user cloudtasks.enqueuer storage.objectUser \
               cloudkms.cryptoKeyEncrypterDecrypter secretmanager.secretAccessor \
               logging.logWriter monitoring.metricWriter run.invoker; do
     gcloud projects add-iam-policy-binding $PROJECT \
       --member="serviceAccount:buildercfo-web@${PROJECT}.iam.gserviceaccount.com" \
       --role="roles/${ROLE}"
   done

   # Worker service account: Firestore, KMS, Logging
   for ROLE in datastore.user cloudkms.cryptoKeyEncrypterDecrypter logging.logWriter; do
     gcloud projects add-iam-policy-binding $PROJECT \
       --member="serviceAccount:buildercfo-worker@${PROJECT}.iam.gserviceaccount.com" \
       --role="roles/${ROLE}"
   done

   # CI/CD service account: Build, Deploy, Push to AR
   for ROLE in cloudbuild.builds.editor run.admin artifactregistry.writer iam.serviceAccountUser \
               datastore.indexAdmin firebase.developAdmin; do
     gcloud projects add-iam-policy-binding $PROJECT \
       --member="serviceAccount:buildercfo-cicd@${PROJECT}.iam.gserviceaccount.com" \
       --role="roles/${ROLE}"
   done
   ```

8. **Create Cloud Tasks queues**:
   ```bash
   for QUEUE in webhook-processor agent-runs procore-sync-incremental qbo-sync-incremental; do
     gcloud tasks queues create $QUEUE --location=us-central1 --project=buildercfo-ai-prod
   done
   ```

9. **Provision secrets in Secret Manager**:
   ```bash
   PROJECT=buildercfo-ai-prod
   for SECRET in procore-client-secret procore-webhook-secret \
                 qbo-client-secret qbo-webhook-verifier-token \
                 anthropic-api-key \
                 stripe-secret-key stripe-webhook-secret \
                 resend-api-key; do
     echo -n "REPLACE-ME" | gcloud secrets create $SECRET \
       --data-file=- --project=$PROJECT
     # then later:
     # echo -n "REAL-VALUE" | gcloud secrets versions add $SECRET --data-file=-
   done

   # Grant the web SA access to read them
   for SECRET in procore-client-secret procore-webhook-secret qbo-client-secret \
                 qbo-webhook-verifier-token anthropic-api-key stripe-secret-key \
                 stripe-webhook-secret resend-api-key; do
     gcloud secrets add-iam-policy-binding $SECRET \
       --member="serviceAccount:buildercfo-web@${PROJECT}.iam.gserviceaccount.com" \
       --role="roles/secretmanager.secretAccessor" --project=$PROJECT
   done
   ```

10. **Create Cloud Run Jobs** (initial sync workers):
    ```bash
    # These are created idempotently by the first deploy via cloudbuild.yaml,
    # but seed them now so the deploy can `update` rather than create.
    gcloud run jobs create procore-initial-sync \
      --image=us-central1-docker.pkg.dev/$PROJECT/buildercfo/worker:latest \
      --region=us-central1 \
      --service-account=buildercfo-worker@$PROJECT.iam.gserviceaccount.com \
      --cpu=2 --memory=2Gi --max-retries=2 --task-timeout=3600 \
      --project=$PROJECT

    gcloud run jobs create qbo-initial-sync \
      --image=us-central1-docker.pkg.dev/$PROJECT/buildercfo/worker:latest \
      --region=us-central1 \
      --service-account=buildercfo-worker@$PROJECT.iam.gserviceaccount.com \
      --cpu=1 --memory=1Gi --max-retries=2 --task-timeout=3600 \
      --project=$PROJECT
    ```

11. **Create Cloud Scheduler jobs**:
    ```bash
    # Daily owner briefings — every 15 minutes, fans out per tenant
    gcloud scheduler jobs create http daily-briefings-trigger \
      --location=us-central1 \
      --schedule="*/15 * * * *" \
      --uri="https://app.buildercfo.com/api/cron/daily-briefings" \
      --http-method=POST \
      --oidc-service-account-email=buildercfo-worker@$PROJECT.iam.gserviceaccount.com \
      --project=$PROJECT

    # Procore reconciliation every 6 hours
    gcloud scheduler jobs create http procore-reconcile \
      --location=us-central1 \
      --schedule="0 */6 * * *" \
      --uri="https://app.buildercfo.com/api/cron/procore-reconcile" \
      --http-method=POST \
      --oidc-service-account-email=buildercfo-worker@$PROJECT.iam.gserviceaccount.com \
      --project=$PROJECT
    ```

12. **Set up Cloud Build trigger** (GitHub):
    - Cloud Build → Triggers → Create.
    - Source: GitHub → connect repo.
    - Event: Push to a branch → `^main$`.
    - Configuration: Cloud Build configuration file → `/cloudbuild.yaml`.
    - Service account: `buildercfo-cicd@${PROJECT}.iam.gserviceaccount.com`.

## Manual deploy commands

```bash
# Full build + push + Cloud Run deploy + Firestore rules deploy
gcloud builds submit --config cloudbuild.yaml \
  --project=buildercfo-ai-prod \
  --substitutions=_ENV=prod

# Just deploy Firestore rules + indexes + Storage rules
firebase deploy --only firestore:rules,firestore:indexes,storage:rules \
  --project=buildercfo-ai-prod

# Trigger a one-off Cloud Run Job execution
gcloud run jobs execute procore-initial-sync \
  --region=us-central1 \
  --args="--job=procore-initial-sync,--tenant-id=ABC123" \
  --project=buildercfo-ai-prod
```

## Custom domain

```bash
gcloud run domain-mappings create \
  --service=buildercfo-web \
  --domain=app.buildercfo.com \
  --region=us-central1 \
  --project=buildercfo-ai-prod
```

Update DNS at the registrar with the CNAME records Google returns.

## Production environment vars (Cloud Run)

Public env vars on the service:
- `NEXT_PUBLIC_APP_URL=https://app.buildercfo.com`
- `NEXT_PUBLIC_FIREBASE_API_KEY=` (from Firebase Console → Project Settings)
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID=`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=`
- `NEXT_PUBLIC_FIREBASE_APP_ID=`
- `NEXT_PUBLIC_FIREBASE_EMULATORS=0`
- `GCP_PROJECT=buildercfo-ai-prod`
- `GCP_LOCATION=us-central1`
- `KMS_KEY_NAME=projects/buildercfo-ai-prod/locations/us-central1/keyRings/buildercfo/cryptoKeys/token-encryption-key`
- `WORKER_SERVICE_ACCOUNT_EMAIL=person1@example.com`
- `PROCORE_API_BASE_URL=https://api.procore.com`
- `PROCORE_LOGIN_URL=https://login.procore.com`
- `QBO_ENVIRONMENT=production`
- `ANTHROPIC_MODEL_DEFAULT=claude-sonnet-4-6`
- `ANTHROPIC_MODEL_COMPLEX=claude-opus-4-7`
- `ANTHROPIC_MODEL_FAST=claude-haiku-4-5`

Secrets (mounted via `--set-secrets`):
- `PROCORE_CLIENT_SECRET`
- `PROCORE_WEBHOOK_SECRET`
- `QBO_CLIENT_SECRET`
- `QBO_WEBHOOK_VERIFIER_TOKEN`
- `ANTHROPIC_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`

## Cold start mitigation

We use `--min-instances=1` to keep one Cloud Run instance warm. This costs
~$15/mo at idle but eliminates the 2-5s cold start on the OAuth callback
flow — critical for new-user activation.

## Rolling back

```bash
# List recent revisions
gcloud run revisions list --service=buildercfo-web --region=us-central1

# Route traffic to a prior revision
gcloud run services update-traffic buildercfo-web \
  --to-revisions=buildercfo-web-00042-abc=100 \
  --region=us-central1

# Roll back Firestore rules to a previous version
firebase firestore:rules:rollback --version=<version-id>
```

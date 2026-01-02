#!/bin/sh

set -e

CERT_DIR="/etc/nginx/certs"
CRT="$CERT_DIR/selfsigned.crt"
KEY="$CERT_DIR/selfsigned.key"

mkdir -p "$CERT_DIR"


# Generate a self-signed certificate (with SAN support)
generate_cert() {
    SAN="${SSL_SAN:-DNS:localhost}"

    echo "Generating certificate with SAN: $SAN"

    # Temporary openssl config including SAN extension
    CONF=$(mktemp)

    cat > "$CONF" <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = ext

[dn]
CN = localhost

[ext]
subjectAltName = $SAN
EOF

    openssl req -x509 -nodes -days 365 \
        -newkey rsa:2048 \
        -keyout "$KEY" \
        -out "$CRT" \
        -config "$CONF"

    rm -f "$CONF"

    echo "New self-signed certificate generated."
}


# Decide if certificate should be generated or renewed
should_generate_cert() {
    # Missing cert/key
    if [ ! -f "$CRT" ] || [ ! -f "$KEY" ]; then
        echo "Certificate or key missing."
        return 0
    fi

    # Extract expiration date
    exp_date=$(openssl x509 -enddate -noout -in "$CRT" | sed 's/.*=//')
    exp_epoch=$(date -d "$exp_date" +%s)
    now_epoch=$(date +%s)

    days_left=$(( (exp_epoch - now_epoch) / 86400 ))

    echo "Current certificate expires in $days_left days."

    # Renew if expired or expiring within 7 days
    if [ "$days_left" -le 7 ]; then
        echo "Certificate is expired or expiring soon (<= 7 days). Renewal required."
        return 0
    fi

    return 1
}


# SSL logic gate
if [ "$GENERATE_SSL" = "true" ]; then
    echo "SSL generation enabled."

    if should_generate_cert; then
        generate_cert
    else
        echo "Existing certificate is valid. No regeneration needed."
    fi
else
    echo "SSL generation disabled. Skipping certificate logic."
fi


# Start nginx
echo "Starting Nginx..."
exec nginx -g "daemon off;"
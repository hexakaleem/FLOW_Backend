pipeline {
    agent any

    environment {
        ENV_FILE = '/home/ubuntu/flow-backend/.env'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                    env.BUILD_TAG = "${env.BUILD_NUMBER}-${env.GIT_COMMIT_SHORT}"
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                sh '''
                    echo "Building monolith..."
                    docker build \
                        --target monolith \
                        -t flow-monolith:${BUILD_TAG} \
                        -t flow-monolith:latest \
                        . || exit 1

                    echo "Building gateway..."
                    docker build \
                        --target gateway \
                        -t flow-gateway:${BUILD_TAG} \
                        -t flow-gateway:latest \
                        . || exit 1

                    echo "Building realtime..."
                    docker build \
                        --target realtime \
                        -t flow-realtime:${BUILD_TAG} \
                        -t flow-realtime:latest \
                        . || exit 1

                    echo "All images built successfully"
                '''
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    if [ ! -f "${ENV_FILE}" ]; then
                        echo "==========================================="
                        echo "ERROR: ${ENV_FILE} not found!"
                        echo ""
                        echo "Create it once manually:"
                        echo "  sudo -u jenkins mkdir -p /home/ubuntu/flow-backend"
                        echo "  sudo -u jenkins nano /home/ubuntu/flow-backend/.env"
                        echo "==========================================="
                        exit 1
                    fi

                    docker-compose -f docker-compose.yml -p flow-backend down --remove-orphans || true
                    docker-compose --env-file ${ENV_FILE} -f docker-compose.yml -p flow-backend up -d
                '''
            }
        }

        stage('Health Check') {
            steps {
                script {
                    sleep(time: 20, unit: 'SECONDS')
                    def maxRetries = 12
                    def allHealthy = true

                    def retry = 0
                    while (retry < maxRetries) {
                        def code = sh(script: 'curl -sf -o /dev/null -w "%{http_code}" http://localhost:3000/health || true', returnStdout: true).trim()
                        if (code == '200') { println "Gateway: HEALTHY"; break }
                        retry++; println "Gateway check ${retry}/${maxRetries}..."; sleep(5)
                    }
                    if (retry == maxRetries) {
                        println "Gateway FAILED"; sh 'docker-compose -f docker-compose.yml -p flow-backend logs gateway --tail 50 || true'
                        allHealthy = false
                    }

                    retry = 0
                    while (retry < maxRetries) {
                        def code = sh(script: 'curl -sf -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || true', returnStdout: true).trim()
                        if (code == '200') { println "Monolith: HEALTHY"; break }
                        retry++; println "Monolith check ${retry}/${maxRetries}..."; sleep(5)
                    }
                    if (retry == maxRetries) {
                        println "Monolith FAILED"; sh 'docker-compose -f docker-compose.yml -p flow-backend logs monolith --tail 50 || true'
                        allHealthy = false
                    }

                    retry = 0
                    while (retry < maxRetries) {
                        def code = sh(script: 'curl -sf -o /dev/null -w "%{http_code}" http://localhost:3005/health || true', returnStdout: true).trim()
                        if (code == '200') { println "Realtime: HEALTHY"; break }
                        retry++; println "Realtime check ${retry}/${maxRetries}..."; sleep(5)
                    }
                    if (retry == maxRetries) {
                        println "Realtime FAILED"; sh 'docker-compose -f docker-compose.yml -p flow-backend logs realtime --tail 50 || true'
                        allHealthy = false
                    }

                    if (!allHealthy) error("One or more services failed health check")
                    println 'All services healthy!'
                }
            }
        }
    }

    post {
        always {
            sh '''
                docker rmi flow-monolith:${BUILD_TAG} 2>/dev/null || true
                docker rmi flow-gateway:${BUILD_TAG} 2>/dev/null || true
                docker rmi flow-realtime:${BUILD_TAG} 2>/dev/null || true
                docker system prune -f 2>/dev/null || true
            '''
        }
        success {
            echo """SUCCESS! Build: ${BUILD_TAG}"""
        }
        failure {
            echo """FAILED! Build: ${BUILD_TAG}"""
        }
    }
}

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                    env.BUILD_TAG = "${env.BUILD_NUMBER}-${env.GIT_COMMIT_SHORT}"
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                sh '''
                    echo "WORKSPACE=${WORKSPACE}"
                    echo "Files in workspace:"
                    ls -la

                    echo ""
                    echo "Building monolith..."
                        docker build \
                            --target monolith \
                            -t flow-monolith:${BUILD_TAG} \
                            -t flow-monolith:latest \
                            "${WORKSPACE}/backend" || exit 1

                    echo ""
                    echo "Building gateway..."
                        docker build \
                            --target gateway \
                            -t flow-gateway:${BUILD_TAG} \
                            -t flow-gateway:latest \
                            "${WORKSPACE}/backend" || exit 1

                    echo ""
                    echo "Building realtime..."
                        docker build \
                            --target realtime \
                            -t flow-realtime:${BUILD_TAG} \
                            -t flow-realtime:latest \
                            "${WORKSPACE}/backend" || exit 1

                    echo ""
                    echo "All images built successfully"
                '''
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    mkdir -p ${DEPLOY_DIR}

                    cp docker-compose.yml ${DEPLOY_DIR}/

                    if [ ! -f "${DEPLOY_DIR}/.env" ]; then
                        echo "==========================================="
                        echo "ERROR: ${DEPLOY_DIR}/.env not found!"
                        echo ""
                        echo "Create it once manually:"
                        echo "  cd ${DEPLOY_DIR}"
                        echo "  nano .env"
                        echo ""
                        echo "Required variables:"
                        echo "  INTERNAL_API_KEY, JWT_SECRET, CLOUDINARY_URL"
                        echo "==========================================="
                        exit 1
                    fi

                    cd ${DEPLOY_DIR}
                    docker-compose -f docker-compose.yml -p flow-backend down --remove-orphans || true
                    docker-compose -f docker-compose.yml -p flow-backend up -d
                '''
            }
        }

        stage('Health Check') {
            steps {
                script {
                    sleep(time: 20, unit: 'SECONDS')

                    def maxRetries = 12
                    def retry = 0
                    def allHealthy = true

                    retry = 0
                    while (retry < maxRetries) {
                        def code = sh(script: 'curl -sf -o /dev/null -w "%{http_code}" http://localhost:3000/health || true', returnStdout: true).trim()
                        if (code == '200') {
                            println "Gateway: HEALTHY"
                            break
                        }
                        retry++
                        println "Gateway check ${retry}/${maxRetries}..."
                        sleep(5)
                    }
                    if (retry == maxRetries) {
                        println "Gateway health check FAILED"
                        sh 'docker-compose -f ${COMPOSE_FILE} -p flow-backend logs gateway --tail 50 || true'
                        allHealthy = false
                    }

                    retry = 0
                    while (retry < maxRetries) {
                        def code = sh(script: 'curl -sf -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || true', returnStdout: true).trim()
                        if (code == '200') {
                            println "Monolith: HEALTHY"
                            break
                        }
                        retry++
                        println "Monolith check ${retry}/${maxRetries}..."
                        sleep(5)
                    }
                    if (retry == maxRetries) {
                        println "Monolith health check FAILED"
                        sh 'docker-compose -f ${COMPOSE_FILE} -p flow-backend logs monolith --tail 50 || true'
                        allHealthy = false
                    }

                    retry = 0
                    while (retry < maxRetries) {
                        def code = sh(script: 'curl -sf -o /dev/null -w "%{http_code}" http://localhost:3005/health || true', returnStdout: true).trim()
                        if (code == '200') {
                            println "Realtime: HEALTHY"
                            break
                        }
                        retry++
                        println "Realtime check ${retry}/${maxRetries}..."
                        sleep(5)
                    }
                    if (retry == maxRetries) {
                        println "Realtime health check FAILED"
                        sh 'docker-compose -f ${COMPOSE_FILE} -p flow-backend logs realtime --tail 50 || true'
                        allHealthy = false
                    }

                    if (!allHealthy) {
                        error("One or more services failed health check")
                    }

                    println 'All services healthy!'
                }
            }
        }
    }

    post {
        always {
            sh '''
                docker rmi flow-monolith:${BUILD_TAG} 2>/dev/null || true
                docker rmi flow-gateway:${BUILD_TAG} 2>/dev/null || true
                docker rmi flow-realtime:${BUILD_TAG} 2>/dev/null || true
                docker system prune -f 2>/dev/null || true
            '''
        }
        success {
            echo """
            ==========================================
            SUCCESS! Build: ${BUILD_TAG}
            ==========================================
            Gateway:  http://YOUR_EC2_IP:3000
            Realtime: http://YOUR_EC2_IP:3005
            ==========================================
            """
        }
        failure {
            echo """
            ==========================================
            FAILED! Build: ${BUILD_TAG}
            ==========================================
            """
        }
    }
}